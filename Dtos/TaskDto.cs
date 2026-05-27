namespace TaskPerformanceTest.Dtos;

public sealed record TaskDto(
    int TaskID,
    string Title,
    string Status,
    string Priority);
