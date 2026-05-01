using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using PharmaChain.Data;
using PharmaChain.Models;
using PharmaChain.Services;

namespace PharmaChain.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IConfiguration _config;
        private readonly SecurityService _security;

        public AuthController(AppDbContext context, IConfiguration config, SecurityService security)
        {
            _context = context;
            _config = config;
            _security = security;
        }

        [HttpPost("register")]
        public IActionResult Register([FromBody] RegisterDto request)
        {
            if (!_security.IsPasswordStrong(request.Password))
                return BadRequest(new
                {
                    message = "كلمة السر ضعيفة",
                    details = "يجب أن تحتوي كلمة السر على: 8 أحرف على الأقل + رقم واحد + حرف كبير واحد",
                    example = "مثال صحيح: Factory@123"
                });

            // ── الأدوار المسموح بها ──
            // Admin        = مدير البزنس (يدير الأدوية، المستخدمين، التقارير)
            // LedgerAdmin  = مدير السجل (يشوف Blockchain فقط — محايد تقنياً)
            // Factory      = المصنع
            // Distributor  = الموزع
            // Pharmacy     = الصيدلية
            var validRoles = new[] { "Factory", "Distributor", "Pharmacy", "Admin", "LedgerAdmin" };

            if (!validRoles.Contains(request.Role))
                return BadRequest(new { message = "الدور غير صحيح", validRoles });

            if (_context.Users.Any(u => u.Username == request.Username))
                return BadRequest(new { message = "اسم المستخدم موجود مسبقاً" });

            var user = new User
            {
                Username = request.Username,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
                Role = request.Role,
                CreatedAt = DateTime.UtcNow
            };

            _context.Users.Add(user);

            _context.AuditLogs.Add(new AuditLog
            {
                UserId = 0,
                Username = request.Username,
                Action = "Register",
                Details = "تسجيل مستخدم جديد - الدور: " + request.Role,
                Timestamp = DateTime.UtcNow,
                IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "Unknown"
            });

            _context.SaveChanges();
            return Ok(new { message = "تم التسجيل بنجاح", role = user.Role });
        }

        [HttpPost("login")]
        public IActionResult Login([FromBody] LoginDto request)
        {
            if (_security.IsBlocked(request.Username))
                return StatusCode(429, new
                {
                    message = "تم حجب الحساب مؤقتاً",
                    details = "بسبب محاولات دخول متعددة — انتظر 5 دقائق"
                });

            var user = _context.Users.FirstOrDefault(u => u.Username == request.Username);

            if (user == null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
            {
                _security.RecordFailedAttempt(request.Username);

                var attempts = _security.GetAttempts(request.Username);
                var remaining = 5 - attempts;

                _context.AuditLogs.Add(new AuditLog
                {
                    UserId = 0,
                    Username = request.Username,
                    Action = "FailedLogin",
                    Details = "محاولة دخول فاشلة — المحاولات المتبقية: " + remaining,
                    Timestamp = DateTime.UtcNow,
                    IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "Unknown"
                });
                _context.SaveChanges();

                if (remaining <= 0)
                    return StatusCode(429, new { message = "تم حجب الحساب لمدة 5 دقائق" });

                return Unauthorized(new
                {
                    message = "اسم المستخدم أو كلمة السر غلط",
                    remainingAttempts = remaining
                });
            }

            _security.ResetAttempts(request.Username);
            var token = GenerateToken(user);

            _context.AuditLogs.Add(new AuditLog
            {
                UserId = user.Id,
                Username = user.Username,
                Action = "Login",
                Details = "دخول ناجح - الدور: " + user.Role,
                Timestamp = DateTime.UtcNow,
                IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "Unknown"
            });
            _context.SaveChanges();

            return Ok(new { token, username = user.Username, role = user.Role });
        }

        private string GenerateToken(User user)
        {
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_config["Jwt:Key"]!));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
            var claims = new[]
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(ClaimTypes.Name, user.Username),
                new Claim(ClaimTypes.Role, user.Role)
            };
            var token = new JwtSecurityToken(
                issuer: _config["Jwt:Issuer"],
                audience: _config["Jwt:Audience"],
                claims: claims,
                expires: DateTime.UtcNow.AddHours(8),
                signingCredentials: creds
            );
            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }

    public class RegisterDto
    {
        public string Username { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
    }

    public class LoginDto
    {
        public string Username { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
    }
}