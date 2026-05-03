using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using PharmaChain.Data;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(
        builder.Configuration.GetConnectionString("DefaultConnection")));
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
builder.Services.AddHttpClient();                                         // للـ AiTokenService
builder.Services.AddScoped<PharmaChain.Services.AiTokenService>();       // AI Token Generator

var app = builder.Build();
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.EnsureCreated();
    // إضافة عمود AiToken إذا لم يكن موجوداً (للقواعد الموجودة مسبقاً)
    try
    {
        db.Database.ExecuteSqlRaw(
            "IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'Drugs') AND name = N'AiToken') " +
            "ALTER TABLE Drugs ADD AiToken NVARCHAR(MAX) NOT NULL DEFAULT ''");
    }
    catch { /* يُهمَل إذا DB غير موجودة بعد */ }
}
app.UseDefaultFiles();
app.UseStaticFiles();
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}
app.UseCors("AllowAll");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.Run();