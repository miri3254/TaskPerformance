using Microsoft.EntityFrameworkCore;
using TaskPerformanceTest.Models;

namespace TaskPerformanceTest.Data;

public sealed class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options)
    {
    }

    public DbSet<TaskItem> Tasks => Set<TaskItem>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<TaskItem>(entity =>
        {
            entity.HasKey(task => task.TaskID);

            entity.Property(task => task.Title)
                .HasMaxLength(200)
                .IsRequired();

            entity.Property(task => task.Status)
                .HasMaxLength(20)
                .IsRequired();

            entity.Property(task => task.Priority)
                .HasMaxLength(20)
                .IsRequired();

            entity.HasIndex(task => task.Status);
        });
    }
}
