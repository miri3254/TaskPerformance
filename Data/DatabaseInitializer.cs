using Microsoft.EntityFrameworkCore;
using TaskPerformanceTest.Models;

namespace TaskPerformanceTest.Data;

public static class DatabaseInitializer
{
    private const int SeedTaskCount = 6000;
    private const int ActiveTaskCount = 4000;

    private static readonly string[] Statuses =
    [
        "Pending",
        "InProgress",
        "Completed"
    ];

    private static readonly string[] Priorities =
    [
        "Low",
        "Medium",
        "High"
    ];

    private static readonly string[] Actions =
    [
        "בדיקת",
        "הכנת",
        "אימות",
        "תיעוד",
        "שיפור",
        "תזמון",
        "ניתוח",
        "עדכון",
        "פרסום",
        "בדיקת איכות"
    ];

    private static readonly string[] Subjects =
    [
        "דוח לקוחות",
        "לוח ביצועים",
        "רשימת שחרור גרסה",
        "גיבוי בסיס נתונים",
        "חוזה API",
        "תור פניות תמיכה",
        "תוכנית פריסה",
        "הערות אבטחה",
        "מדדי שימוש",
        "מסמך העברת משמרת"
    ];

    public static async Task InitializeAsync(IServiceProvider services)
    {
        await using var scope = services.CreateAsyncScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        await dbContext.Database.EnsureCreatedAsync();

        if (await HasExpectedSeedDataAsync(dbContext))
        {
            return;
        }

        await dbContext.Database.EnsureDeletedAsync();
        await dbContext.Database.EnsureCreatedAsync();

        var tasks = Enumerable.Range(1, SeedTaskCount)
            .Select(CreateTask)
            .ToList();

        await dbContext.Tasks.AddRangeAsync(tasks);
        await dbContext.SaveChangesAsync();
    }

    private static TaskItem CreateTask(int index)
    {
        var status = index <= ActiveTaskCount
            ? Statuses[index % 2]
            : "Completed";
        var priority = Priorities[(index / 3) % Priorities.Length];
        var action = Actions[index % Actions.Length];
        var subject = Subjects[(index / Actions.Length) % Subjects.Length];

        return new TaskItem
        {
            Title = $"{action} {subject} #{index:0000}",
            Status = status,
            Priority = priority
        };
    }

    private static async Task<bool> HasExpectedSeedDataAsync(AppDbContext dbContext)
    {
        var totalTasks = await dbContext.Tasks.CountAsync();

        if (totalTasks != SeedTaskCount)
        {
            return false;
        }

        var activeTasks = await dbContext.Tasks.CountAsync(task =>
            task.Status == "Pending" || task.Status == "InProgress");

        return activeTasks == ActiveTaskCount;
    }
}
