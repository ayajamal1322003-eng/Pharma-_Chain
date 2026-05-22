using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using PharmaChain.Data;

var builder = WebApplication.CreateBuilder(args);

// Railway sets PORT env variable
var port = Environment.GetEnvironmentVariable("PORT") ?? "7036";
builder.WebHost.UseUrls($"http://0.0.0.0:{port}");

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// ── Database Provider ─────────────────────────────────────────────────────
// Set "DatabaseProvider": "Sqlite" in appsettings.Colab.json for Google Colab.
// Set "DatabaseProvider": "SqlServer" (or omit) for Windows/production.
var dbProvider = builder.Configuration["DatabaseProvider"] ?? "SqlServer";

if (dbProvider.Equals("Sqlite", StringComparison.OrdinalIgnoreCase))
{
    builder.Services.AddDbContext<AppDbContext>(options =>
        options.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection")));
}
else
{
    builder.Services.AddDbContext<AppDbContext>(options =>
        options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));
}
// ─────────────────────────────────────────────────────────────────────────

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"]!))
        };
    });
builder.Services.AddAuthorization();
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader());
});
builder.Services.AddSingleton<PharmaChain.Services.SecurityService>();
builder.Services.AddSingleton<PharmaChain.Services.NodeSyncService>();
builder.Services.AddHttpClient();
builder.Services.AddScoped<PharmaChain.Services.AiTokenService>();
builder.Services.AddScoped<PharmaChain.Services.BlockchainService>();

var app = builder.Build();

// ── Database Initialization ───────────────────────────────────────────────
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.EnsureCreated();

    if (!dbProvider.Equals("Sqlite", StringComparison.OrdinalIgnoreCase))
    {
        // ── SQL Server: patch columns that predate the current schema ──

        try { db.Database.ExecuteSqlRaw(
            "IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'Drugs') AND name = N'AiToken') " +
            "ALTER TABLE Drugs ADD AiToken NVARCHAR(MAX) NOT NULL DEFAULT ''"); }
        catch { }

        // ── ManufactureDate (v3) — تاريخ إنتاج الدواء ──
        try { db.Database.ExecuteSqlRaw(
            "IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'Drugs') AND name = N'ManufactureDate') " +
            "ALTER TABLE Drugs ADD ManufactureDate DATETIME2 NOT NULL DEFAULT GETUTCDATE()"); }
        catch { }

        db.Database.ExecuteSqlRaw(
            "IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = N'QrQuotas') " +
            "CREATE TABLE QrQuotas (" +
            "  Id INT IDENTITY(1,1) PRIMARY KEY," +
            "  Role NVARCHAR(50) NOT NULL DEFAULT ''," +
            "  Username NVARCHAR(100) NULL," +
            "  QuotaLimit INT NOT NULL DEFAULT 100," +
            "  IssuedCount INT NOT NULL DEFAULT 0," +
            "  PeriodType NVARCHAR(20) NOT NULL DEFAULT 'Monthly'," +
            "  PeriodStart DATETIME2 NOT NULL DEFAULT GETUTCDATE()," +
            "  PeriodEnd DATETIME2 NOT NULL DEFAULT GETUTCDATE()," +
            "  IsActive BIT NOT NULL DEFAULT 1," +
            "  CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE()," +
            "  UpdatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE()" +
            ")");

        db.Database.ExecuteSqlRaw(
            "IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = N'QrIssuances') " +
            "CREATE TABLE QrIssuances (" +
            "  Id INT IDENTITY(1,1) PRIMARY KEY," +
            "  DrugId INT NOT NULL DEFAULT 0," +
            "  DrugName NVARCHAR(200) NOT NULL DEFAULT ''," +
            "  UserId INT NOT NULL DEFAULT 0," +
            "  Username NVARCHAR(100) NOT NULL DEFAULT ''," +
            "  Role NVARCHAR(50) NOT NULL DEFAULT ''," +
            "  QuotaId INT NOT NULL DEFAULT 0," +
            "  QuotaLimit INT NOT NULL DEFAULT 0," +
            "  SequenceNumber INT NOT NULL DEFAULT 0," +
            "  Status NVARCHAR(20) NOT NULL DEFAULT 'Valid'," +
            "  SuspicionReason NVARCHAR(500) NULL," +
            "  Signature NVARCHAR(100) NOT NULL DEFAULT ''," +
            "  IpAddress NVARCHAR(60) NOT NULL DEFAULT ''," +
            "  IssuedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE()" +
            ")");

        // ── QR lifecycle columns on DrugTransactions (added in v2) ──
        try { db.Database.ExecuteSqlRaw(
            "IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'DrugTransactions') AND name = N'ActionType') " +
            "ALTER TABLE DrugTransactions ADD ActionType NVARCHAR(50) NOT NULL DEFAULT 'TRANSFER'"); }
        catch { }

        try { db.Database.ExecuteSqlRaw(
            "IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'DrugTransactions') AND name = N'QrIssuanceId') " +
            "ALTER TABLE DrugTransactions ADD QrIssuanceId INT NULL"); }
        catch { }
    }
    else
    {
        // ── SQLite: EnsureCreated handles fresh DBs; patch existing ones ──
        try { db.Database.ExecuteSqlRaw(
            "ALTER TABLE Drugs ADD COLUMN ManufactureDate TEXT NOT NULL DEFAULT (datetime('now'))"); }
        catch { }

        try { db.Database.ExecuteSqlRaw(
            "ALTER TABLE DrugTransactions ADD COLUMN ActionType TEXT NOT NULL DEFAULT 'TRANSFER'"); }
        catch { }

        try { db.Database.ExecuteSqlRaw(
            "ALTER TABLE DrugTransactions ADD COLUMN QrIssuanceId INTEGER NULL"); }
        catch { }
    }
}
// ─────────────────────────────────────────────────────────────────────────

app.UseDefaultFiles();
app.UseStaticFiles();

// Enable Swagger in Development and in Colab
if (app.Environment.IsDevelopment() || app.Environment.IsEnvironment("Colab"))
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("AllowAll");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.Run();
