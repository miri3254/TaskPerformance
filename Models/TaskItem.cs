namespace TaskPerformanceTest.Models;

public sealed class TaskItem
{
    public int TaskID { get; set; }

    public required string Title { get; set; }

    public required string Status { get; set; }

    public required string Priority { get; set; }
}
