using Microsoft.AspNetCore.Mvc;
using PharmaChain.Data;

namespace PharmaChain.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class VerifyController : ControllerBase
    {
        private readonly AppDbContext _context;

        public VerifyController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet("{drugId}")]
        public IActionResult VerifyDrug(int drugId)
        {
            var drug = _context.Drugs.Find(drugId);
            if (drug == null)
                return Ok(new { authentic = false, message = "الدواء غير موجود في النظام" });

            var isExpired = drug.ExpiryDate < DateTime.UtcNow;

            var history = _context.DrugTransactions
                .Where(t => t.DrugId == drugId)
                .OrderBy(t => t.Timestamp)
                .Select(t => new
                {
                    t.FromRole,
                    t.ToRole,
                    t.Timestamp,
                    t.BlockHash
                })
                .ToList();

            return Ok(new
            {
                authentic = true,
                name = drug.Name,
                manufacturer = drug.Manufacturer,
                expiryDate = drug.ExpiryDate,
                isExpired = isExpired,
                status = isExpired ? "منتهي الصلاحية ❌" : "صالح ✅",
                trackingHistory = history
            });
        }
    }
}