namespace TaskPerformanceTest.Dtos;

public sealed record TasksResponseDto(
    long ServerTimeMs,
    int Count,
    IReadOnlyList<TaskDto> Tasks);
