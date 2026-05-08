using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using PharmaChain.Data;

var builder = WebApplication.CreateBuilder(args);
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

var app = builder.Build();

// ── Database Initialization ───────────────────────────────────────────────
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.EnsureCreated();

    // SQL Server-specific migration patches for existing databases that predate
    // the AiToken column and QR control tables. Skipped for SQLite because
    // EnsureCreated() builds the full schema from models on a fresh database.
    if (!dbProvider.Equals("Sqlite", StringComparison.OrdinalIgnoreCase))
    {
        try
        {
            db.Database.ExecuteSqlRaw(
                "IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'Drugs') AND name = N'AiToken') " +
                "ALTER TABLE Drugs ADD AiToken NVARCHAR(MAX) NOT NULL DEFAULT ''");
        }
        catch { /* ignored on fresh databases */ }

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
