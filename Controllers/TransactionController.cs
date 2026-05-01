using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using PharmaChain.Data;
using PharmaChain.Models;
using PharmaChain.Services;

namespace PharmaChain.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class TransactionController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly string _chainFilePath;
        private readonly NodeSyncService _nodeSync;

        private const int DIFFICULTY = 2;
        private readonly string DIFFICULTY_PREFIX;

        public TransactionController(AppDbContext context, IWebHostEnvironment env, NodeSyncService nodeSync)
        {
            _context = context;
            _chainFilePath = Path.Combine(env.ContentRootPath, "blockchain_chain.json");
            _nodeSync = nodeSync;
            DIFFICULTY_PREFIX = new string('0', DIFFICULTY);
        }

        // ════════════════════════════════════════════════════════
        //  POST /api/transaction/transfer
        // ════════════════════════════════════════════════════════
        [HttpPost("transfer")]
        public IActionResult Transfer([FromBody] TransferDto request)
        {
            var drug = _context.Drugs.Find(request.DrugId);
            if (drug == null) return NotFound("الدواء غير موجود");

            var username = User.FindFirst(ClaimTypes.Name)?.Value ?? "Unknown";
            var role = User.FindFirst(ClaimTypes.Role)?.Value ?? "Unknown";

            var allowedTransfers = new Dictionary<string, string>
            {
                { "Factory",     "Distributor" },
                { "Distributor", "Pharmacy"    },
                { "Pharmacy",    "Customer"    }
            };

            if (!allowedTransfers.ContainsKey(role))
                return BadRequest("ليس لديك صلاحية النقل");

            var lastBlock = _context.DrugTransactions
                                          .OrderByDescending(t => t.BlockNumber)
                                          .FirstOrDefault();
            var previousHash = lastBlock?.BlockHash ?? "0000000000000000";
            var nextBlockNumber = (lastBlock?.BlockNumber ?? 0) + 1;

            var transaction = new DrugTransaction
            {
                BlockNumber = nextBlockNumber,
                DrugId = request.DrugId,
                DrugName = drug.Name,
                FromRole = role,
                FromUsername = username,
                ToRole = allowedTransfers[role],
                ToUsername = request.ToUsername,
                Status = "Transferred",
                Timestamp = DateTime.UtcNow,
                PreviousHash = previousHash
            };

            var mineResult = MineBlock(transaction);
            transaction.BlockHash = mineResult.Hash;
            transaction.Nonce = mineResult.Nonce;
            transaction.MerkleRoot = ComputeMerkleRoot(transaction);

            _context.DrugTransactions.Add(transaction);
            _context.AuditLogs.Add(new AuditLog
            {
                UserId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0"),
                Username = username,
                Action = "TransferDrug",
                Details = $"نقل دواء {drug.Name} من {role} إلى {allowedTransfers[role]} | Block #{nextBlockNumber} | Nonce: {mineResult.Nonce}",
                Timestamp = DateTime.UtcNow,
                IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "Unknown"
            });

            _context.SaveChanges();
            SaveChainToJson();

            // ── إرسال الـ Block للـ Nodes الثانية
            _ = _nodeSync.BroadcastBlock(new
            {
                blockNumber = transaction.BlockNumber,
                drugName = transaction.DrugName,
                fromRole = transaction.FromRole,
                toRole = transaction.ToRole,
                blockHash = transaction.BlockHash,
                previousHash = transaction.PreviousHash,
                nonce = transaction.Nonce,
                merkleRoot = transaction.MerkleRoot,
                timestamp = transaction.Timestamp
            });

            return Ok(new
            {
                message = "تم النقل بنجاح",
                blockNumber = transaction.BlockNumber,
                blockHash = transaction.BlockHash,
                previousHash = transaction.PreviousHash,
                nonce = transaction.Nonce,
                merkleRoot = transaction.MerkleRoot,
                difficulty = DIFFICULTY,
                from = role,
                to = allowedTransfers[role]
            });
        }

        // ════════════════════════════════════════════════════════
        //  GET /api/transaction/history/{drugId}
        // ════════════════════════════════════════════════════════
        [HttpGet("history/{drugId}")]
        public IActionResult GetHistory(int drugId)
        {
            var history = _context.DrugTransactions
                .Where(t => t.DrugId == drugId)
                .OrderBy(t => t.BlockNumber)
                .Select(t => new {
                    t.Id,
                    t.BlockNumber,
                    t.DrugId,
                    t.DrugName,
                    t.FromRole,
                    t.FromUsername,
                    t.ToRole,
                    t.ToUsername,
                    t.Status,
                    t.Timestamp,
                    t.BlockHash,
                    t.PreviousHash,
                    t.Nonce,
                    t.MerkleRoot
                })
                .ToList();

            return Ok(history);
        }

        // ════════════════════════════════════════════════════════
        //  GET /api/transaction/chain
        // ════════════════════════════════════════════════════════
        [HttpGet("chain")]
        public IActionResult GetChain()
        {
            var chain = _context.DrugTransactions
                .OrderBy(t => t.BlockNumber)
                .Select(t => new {
                    t.Id,
                    t.BlockNumber,
                    t.DrugId,
                    t.DrugName,
                    t.FromRole,
                    t.FromUsername,
                    t.ToRole,
                    t.ToUsername,
                    t.Status,
                    t.Timestamp,
                    t.BlockHash,
                    t.PreviousHash,
                    t.Nonce,
                    t.MerkleRoot
                })
                .ToList();

            return Ok(new
            {
                totalBlocks = chain.Count,
                difficulty = DIFFICULTY,
                chain
            });
        }

        // ════════════════════════════════════════════════════════
        //  GET /api/transaction/verify-chain
        // ════════════════════════════════════════════════════════
        [HttpGet("verify-chain")]
        public IActionResult VerifyChain()
        {
            var chain = _context.DrugTransactions
                .OrderBy(t => t.BlockNumber)
                .ToList();

            if (chain.Count == 0)
                return Ok(new { valid = true, message = "✅ السلسلة فارغة", totalBlocks = 0 });

            for (int i = 0; i < chain.Count; i++)
            {
                var block = chain[i];

                if (!block.BlockHash.StartsWith(DIFFICULTY_PREFIX))
                    return Ok(new
                    {
                        valid = false,
                        tamperedBlock = block.BlockNumber,
                        reason = "Proof of Work",
                        message = $"⚠️ Block #{block.BlockNumber} لا يحقق شرط Proof of Work"
                    });

                if (i > 0 && block.PreviousHash != chain[i - 1].BlockHash)
                    return Ok(new
                    {
                        valid = false,
                        tamperedBlock = block.BlockNumber,
                        reason = "Hash Chain Broken",
                        message = $"⚠️ انكسرت السلسلة عند Block #{block.BlockNumber}"
                    });

                var expectedMerkle = ComputeMerkleRoot(block);
                if (block.MerkleRoot != expectedMerkle)
                    return Ok(new
                    {
                        valid = false,
                        tamperedBlock = block.BlockNumber,
                        reason = "Merkle Root Mismatch",
                        message = $"⚠️ تم التلاعب ببيانات Block #{block.BlockNumber}"
                    });
            }

            return Ok(new
            {
                valid = true,
                totalBlocks = chain.Count,
                difficulty = DIFFICULTY,
                message = $"✅ السلسلة سليمة — {chain.Count} block تم التحقق منها بنجاح"
            });
        }

        // ════════════════════════════════════════════════════════
        //  GET /api/transaction/nodes
        // ════════════════════════════════════════════════════════
        [HttpGet("nodes")]
        public IActionResult GetNodes()
        {
            return Ok(new
            {
                currentNode = "http://localhost:7036",
                peers = _nodeSync.GetPeerNodes(),
                totalPeers = _nodeSync.GetPeerNodes().Count
            });
        }

        // ════════════════════════════════════════════════════════
        //  POST /api/transaction/receive-block
        //  يستقبل Block من Node آخر — بدون Auth
        // ════════════════════════════════════════════════════════
        [HttpPost("receive-block")]
        [AllowAnonymous]
        public IActionResult ReceiveBlock([FromBody] ReceivedBlockDto block)
        {
            return Ok(new { received = true, blockNumber = block.BlockNumber });
        }

        // ════════════════════════════════════════════════════════
        //  POST /api/transaction/demo-tamper/{blockId}
        // ════════════════════════════════════════════════════════
        [HttpPost("demo-tamper/{blockId}")]
        [Authorize(Roles = "Admin")]
        public IActionResult DemoTamper(int blockId)
        {
            var block = _context.DrugTransactions.Find(blockId);
            if (block == null) return NotFound("Block غير موجود");

            block.ToUsername = "HACKED_" + block.ToUsername;
            _context.SaveChanges();

            return Ok(new
            {
                message = $"⚠️ تم تعديل Block #{block.BlockNumber} — اضغط Verify لكشف التلاعب",
                blockNumber = block.BlockNumber,
                newUsername = block.ToUsername
            });
        }

        // ════════════════════════════════════════════════════════
        //  POST /api/transaction/demo-restore
        // ════════════════════════════════════════════════════════
        [HttpPost("demo-restore")]
        [Authorize(Roles = "Admin")]
        public IActionResult DemoRestore()
        {
            if (!System.IO.File.Exists(_chainFilePath))
                return NotFound("لا يوجد backup — قم بعمل transfer أولاً");

            var json = System.IO.File.ReadAllText(_chainFilePath);
            var saved = JsonSerializer.Deserialize<List<ChainBackup>>(json);
            if (saved == null) return BadRequest("ملف الـ backup تالف");

            foreach (var backup in saved)
            {
                var block = _context.DrugTransactions.Find(backup.Id);
                if (block == null) continue;
                block.ToUsername = backup.ToUsername;
                block.FromUsername = backup.FromUsername;
                block.BlockHash = backup.BlockHash;
                block.MerkleRoot = backup.MerkleRoot;
            }

            _context.SaveChanges();
            return Ok(new { message = "✅ تمت استعادة السلسلة من الـ Backup بنجاح" });
        }

        // ════════════════════════════════════════════════════════
        //  PRIVATE — Proof of Work Mining
        // ════════════════════════════════════════════════════════
        private (string Hash, int Nonce) MineBlock(DrugTransaction t)
        {
            int nonce = 0;
            while (true)
            {
                var data = $"{t.BlockNumber}{t.DrugId}{t.FromRole}{t.ToRole}{t.Timestamp}{t.PreviousHash}{nonce}";
                var hash = ComputeSHA256(data)[..16];
                if (hash.StartsWith(DIFFICULTY_PREFIX))
                    return (hash, nonce);
                nonce++;
            }
        }

        // ════════════════════════════════════════════════════════
        //  PRIVATE — Merkle Root
        // ════════════════════════════════════════════════════════
        private string ComputeMerkleRoot(DrugTransaction t)
        {
            var leaves = new[]
            {
                ComputeSHA256(t.DrugId.ToString()),
                ComputeSHA256(t.DrugName),
                ComputeSHA256(t.FromRole),
                ComputeSHA256(t.FromUsername),
                ComputeSHA256(t.ToRole),
                ComputeSHA256(t.ToUsername),
                ComputeSHA256(t.Timestamp.ToString("O")),
                ComputeSHA256(t.Status)
            };

            var level = leaves.ToList();
            while (level.Count > 1)
            {
                var next = new List<string>();
                for (int i = 0; i < level.Count; i += 2)
                {
                    var left = level[i];
                    var right = i + 1 < level.Count ? level[i + 1] : left;
                    next.Add(ComputeSHA256(left + right));
                }
                level = next;
            }

            return level[0][..16];
        }

        // ════════════════════════════════════════════════════════
        //  PRIVATE — SHA-256
        // ════════════════════════════════════════════════════════
        private string ComputeSHA256(string input)
        {
            using var sha256 = SHA256.Create();
            var bytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(input));
            return Convert.ToHexString(bytes);
        }

        // ════════════════════════════════════════════════════════
        //  PRIVATE — حفظ السلسلة على JSON
        // ════════════════════════════════════════════════════════
        private void SaveChainToJson()
        {
            var chain = _context.DrugTransactions
                .OrderBy(t => t.BlockNumber)
                .Select(t => new ChainBackup
                {
                    Id = t.Id,
                    BlockNumber = t.BlockNumber,
                    DrugId = t.DrugId,
                    DrugName = t.DrugName,
                    FromRole = t.FromRole,
                    FromUsername = t.FromUsername,
                    ToRole = t.ToRole,
                    ToUsername = t.ToUsername,
                    Status = t.Status,
                    Timestamp = t.Timestamp,
                    BlockHash = t.BlockHash,
                    PreviousHash = t.PreviousHash,
                    Nonce = t.Nonce,
                    MerkleRoot = t.MerkleRoot
                })
                .ToList();

            var json = JsonSerializer.Serialize(chain, new JsonSerializerOptions { WriteIndented = true });
            System.IO.File.WriteAllText(_chainFilePath, json);
        }
    }

    // ════════════════════════════════════════════════════════
    //  DTOs
    // ════════════════════════════════════════════════════════
    public class TransferDto
    {
        public int DrugId { get; set; }
        public string ToUsername { get; set; } = string.Empty;
    }

    public class ReceivedBlockDto
    {
        public int BlockNumber { get; set; }
        public string DrugName { get; set; } = string.Empty;
        public string FromRole { get; set; } = string.Empty;
        public string ToRole { get; set; } = string.Empty;
        public string BlockHash { get; set; } = string.Empty;
        public string PreviousHash { get; set; } = string.Empty;
        public int Nonce { get; set; }
        public string MerkleRoot { get; set; } = string.Empty;
        public DateTime Timestamp { get; set; }
    }

    public class ChainBackup
    {
        public int Id { get; set; }
        public int BlockNumber { get; set; }
        public int DrugId { get; set; }
        public string DrugName { get; set; } = string.Empty;
        public string FromRole { get; set; } = string.Empty;
        public string FromUsername { get; set; } = string.Empty;
        public string ToRole { get; set; } = string.Empty;
        public string ToUsername { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public DateTime Timestamp { get; set; }
        public string BlockHash { get; set; } = string.Empty;
        public string PreviousHash { get; set; } = string.Empty;
        public int Nonce { get; set; }
        public string MerkleRoot { get; set; } = string.Empty;
    }
}