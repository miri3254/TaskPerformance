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
}
