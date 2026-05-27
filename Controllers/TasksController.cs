using System.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TaskPerformanceTest.Data;
using TaskPerformanceTest.Dtos;

namespace TaskPerformanceTest.Controllers;

[ApiController]
[Route("api/[controller]")]
public sealed class TasksController : ControllerBase
{
    private static readonly string[] ActiveStatuses =
    [
        "Pending",
        "InProgress"
    ];

    private static readonly string[] AllStatuses =
    [
        "Pending",
        "InProgress",
        "Completed"
    ];

    private static readonly string[] AllPriorities =
    [
        "Low",
        "Medium",
        "High"
    ];

    private readonly AppDbContext _dbContext;

    public TasksController(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    [HttpGet]
    [ProducesResponseType(typeof(TasksResponseDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<TasksResponseDto>> GetTasks(CancellationToken cancellationToken)
    {
        var stopwatch = Stopwatch.StartNew();

        var tasks = await _dbContext.Tasks
            .AsNoTracking()
            .Where(task => ActiveStatuses.Contains(task.Status))
            .Select(task => new TaskDto(
                task.TaskID,
                task.Title,
                task.Status,
                task.Priority))
            .ToListAsync(cancellationToken);

        stopwatch.Stop();

        return Ok(new TasksResponseDto(
            stopwatch.ElapsedMilliseconds,
            tasks.Count,
            tasks));
    }

    [HttpPut("{taskId:int}")]
    [ProducesResponseType(typeof(TaskDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<TaskDto>> UpdateTask(
        int taskId,
        UpdateTaskDto request,
        CancellationToken cancellationToken)
    {
        if (!AllStatuses.Contains(request.Status) || !AllPriorities.Contains(request.Priority))
        {
            return BadRequest("Invalid status or priority value.");
        }

        var updatedRows = await _dbContext.Tasks
            .Where(task => task.TaskID == taskId)
            .ExecuteUpdateAsync(setters => setters
                .SetProperty(task => task.Status, request.Status)
                .SetProperty(task => task.Priority, request.Priority),
                cancellationToken);

        if (updatedRows == 0)
        {
            return NotFound();
        }

        var updatedTask = await _dbContext.Tasks
            .AsNoTracking()
            .Where(task => task.TaskID == taskId)
            .Select(task => new TaskDto(
                task.TaskID,
                task.Title,
                task.Status,
                task.Priority))
            .SingleAsync(cancellationToken);

        return Ok(updatedTask);
    }
}
