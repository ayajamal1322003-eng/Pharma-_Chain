using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using PharmaChain.Data;
using PharmaChain.Models;

namespace PharmaChain.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class DrugsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public DrugsController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public IActionResult GetAll()
        {
            try
            {
                var drugs = _context.Drugs.ToList();
                var tamperedDrugs = new List<string>();

                foreach (var drug in drugs)
                {
                    if (string.IsNullOrEmpty(drug.Checksum)) continue;
                    var expected = ComputeChecksum(drug);
                    if (drug.Checksum != expected)
                        tamperedDrugs.Add(drug.Name);
                }

                if (tamperedDrugs.Any())
                {
                    _context.AuditLogs.Add(new AuditLog
                    {
                        UserId = 0,
                        Username = "SYSTEM",
                        Action = "TamperDetected",
                        Details = "تم اكتشاف تلاعب في: " + string.Join(", ", tamperedDrugs),
                        Timestamp = DateTime.UtcNow,
                        IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "Unknown"
                    });
                    _context.SaveChanges();

                    return Ok(new
                    {
                        drugs = drugs,
                        securityAlert = "تم اكتشاف تلاعب في بيانات " + tamperedDrugs.Count + " دواء",
                        tamperedDrugs = tamperedDrugs
                    });
                }

                return Ok(drugs);
            }
            catch (Exception ex)
            {
                return StatusCode(500, "خطأ: " + ex.Message);
            }
        }

        [HttpPost]
        [Authorize(Roles = "Factory,Admin")]
        public IActionResult AddDrug([FromBody] Drug drug)
        {
            try
            {
                // Input Validation
                if (string.IsNullOrWhiteSpace(drug.Name) ||
                    string.IsNullOrWhiteSpace(drug.BatchNumber) ||
                    string.IsNullOrWhiteSpace(drug.Manufacturer))
                    return BadRequest("جميع الحقول مطلوبة");

                if (drug.Name.Length > 100)
                    return BadRequest("اسم الدواء طويل جداً — الحد الأقصى 100 حرف");

                if (drug.Quantity <= 0)
                    return BadRequest("الكمية يجب أن تكون أكبر من صفر");

                if (drug.ExpiryDate <= DateTime.UtcNow)
                    return BadRequest("لا يمكن إضافة دواء منتهي الصلاحية — تاريخ الانتهاء يجب أن يكون في المستقبل");

                // منع XSS
                drug.Name = System.Net.WebUtility.HtmlEncode(drug.Name.Trim());
                drug.Manufacturer = System.Net.WebUtility.HtmlEncode(drug.Manufacturer.Trim());

                var username = User.FindFirst(ClaimTypes.Name)?.Value ?? "Unknown";
                var role = User.FindFirst(ClaimTypes.Role)?.Value ?? "Unknown";

                drug.BatchNumber = HashBatchNumber(drug.BatchNumber);
                drug.AddedByRole = role;
                drug.CreatedAt = DateTime.UtcNow;
                drug.Checksum = string.Empty;

                _context.Drugs.Add(drug);
                _context.SaveChanges();

                // نحسب الـ Checksum بعد الحفظ عشان يكون عندنا الـ ID
                drug.Checksum = ComputeChecksum(drug);
                _context.SaveChanges();

                _context.AuditLogs.Add(new AuditLog
                {
                    UserId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0"),
                    Username = username,
                    Action = "AddDrug",
                    Details = "تم إضافة دواء: " + drug.Name + " | الكمية: " + drug.Quantity,
                    Timestamp = DateTime.UtcNow,
                    IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "Unknown"
                });
                _context.SaveChanges();

                return Ok(new { message = "تم إضافة الدواء بنجاح", id = drug.Id });
            }
            catch (Exception ex)
            {
                return StatusCode(500, "خطأ: " + ex.Message);
            }
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin")]
        public IActionResult DeleteDrug(int id)
        {
            try
            {
                var drug = _context.Drugs.Find(id);
                if (drug == null) return NotFound("الدواء غير موجود");

                var username = User.FindFirst(ClaimTypes.Name)?.Value ?? "Unknown";

                _context.Drugs.Remove(drug);

                _context.AuditLogs.Add(new AuditLog
                {
                    UserId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0"),
                    Username = username,
                    Action = "DeleteDrug",
                    Details = "تم حذف دواء: " + drug.Name,
                    Timestamp = DateTime.UtcNow,
                    IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "Unknown"
                });

                _context.SaveChanges();
                return Ok(new { message = "تم الحذف بنجاح" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, "خطأ: " + ex.Message);
            }
        }

        private string HashBatchNumber(string batchNumber)
        {
            using var sha256 = SHA256.Create();
            var bytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(batchNumber));
            return Convert.ToHexString(bytes)[..16];
        }

        private string ComputeChecksum(Drug drug)
        {
            var data = drug.Id + drug.Name + drug.BatchNumber +
                      drug.ExpiryDate.ToString("yyyy-MM-dd") +
                      drug.Manufacturer + drug.Quantity;
            using var sha256 = SHA256.Create();
            var bytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(data));
            return Convert.ToHexString(bytes)[..16];
        }
    }
}