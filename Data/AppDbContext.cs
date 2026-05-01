using Microsoft.EntityFrameworkCore;
using PharmaChain.Models;

namespace PharmaChain.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options)
            : base(options) { }

        public DbSet<Drug> Drugs { get; set; }
        public DbSet<User> Users { get; set; }
        public DbSet<AuditLog> AuditLogs { get; set; }
        public DbSet<DrugTransaction> DrugTransactions { get; set; }

        // ── جدول جديد: سجل كل عملية مسح QR ──
        public DbSet<QrScanLog> QrScanLogs { get; set; }
    }
}