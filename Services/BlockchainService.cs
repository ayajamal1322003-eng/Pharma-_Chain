using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using PharmaChain.Data;
using PharmaChain.Models;

namespace PharmaChain.Services
{
    /// <summary>
    /// Centralised service for all blockchain operations — mining, Merkle root, and
    /// chain persistence.  Inject into any controller that needs to write a ledger entry.
    /// </summary>
    public class BlockchainService
    {
        private readonly AppDbContext _db;
        private readonly string _chainFilePath;

        // Proof-of-Work difficulty: hash must start with this many zeroes.
        public const int DIFFICULTY = 2;
        private readonly string _difficultyPrefix = new string('0', DIFFICULTY);

        public BlockchainService(AppDbContext db, IWebHostEnvironment env)
        {
            _db = db;
            _chainFilePath = Path.Combine(env.ContentRootPath, "blockchain_chain.json");
        }

        // ════════════════════════════════════════════════════════
        //  CreateTransaction
        //  Mines a new block, persists it to the DB (caller must
        //  call _context.SaveChanges after this returns).
        // ════════════════════════════════════════════════════════
        public DrugTransaction CreateTransaction(
            int drugId,
            string drugName,
            string fromRole,
            string fromUsername,
            string toRole,
            string toUsername,
            string status,
            string actionType,
            int? qrIssuanceId = null)
        {
            var lastBlock = _db.DrugTransactions
                .OrderByDescending(t => t.BlockNumber)
                .FirstOrDefault();

            var previousHash  = lastBlock?.BlockHash ?? "0000000000000000";
            var nextBlockNum  = (lastBlock?.BlockNumber ?? 0) + 1;

            var tx = new DrugTransaction
            {
                BlockNumber   = nextBlockNum,
                DrugId        = drugId,
                DrugName      = drugName,
                FromRole      = fromRole,
                FromUsername  = fromUsername,
                ToRole        = toRole,
                ToUsername    = toUsername,
                Status        = status,
                ActionType    = actionType,
                QrIssuanceId  = qrIssuanceId,
                Timestamp     = DateTime.UtcNow,
                PreviousHash  = previousHash
            };

            var mined        = MineBlock(tx);
            tx.BlockHash     = mined.Hash;
            tx.Nonce         = mined.Nonce;
            tx.MerkleRoot    = ComputeMerkleRoot(tx);

            _db.DrugTransactions.Add(tx);
            return tx;
        }

        // ════════════════════════════════════════════════════════
        //  SaveChainToJson — writes full chain to disk as backup
        // ════════════════════════════════════════════════════════
        public void SaveChainToJson()
        {
            var chain = _db.DrugTransactions
                .OrderBy(t => t.BlockNumber)
                .Select(t => new
                {
                    t.Id, t.BlockNumber, t.DrugId, t.DrugName,
                    t.FromRole, t.FromUsername, t.ToRole, t.ToUsername,
                    t.Status, t.ActionType, t.QrIssuanceId,
                    t.Timestamp, t.BlockHash, t.PreviousHash, t.Nonce, t.MerkleRoot
                })
                .ToList<object>();

            var json = JsonSerializer.Serialize(chain, new JsonSerializerOptions { WriteIndented = true });
            File.WriteAllText(_chainFilePath, json);
        }

        // ════════════════════════════════════════════════════════
        //  Proof-of-Work mining
        // ════════════════════════════════════════════════════════
        private (string Hash, int Nonce) MineBlock(DrugTransaction t)
        {
            int nonce = 0;
            while (true)
            {
                var data = $"{t.BlockNumber}{t.DrugId}{t.FromRole}{t.ToRole}{t.Timestamp}{t.PreviousHash}{nonce}";
                var hash = ComputeSHA256(data)[..16];
                if (hash.StartsWith(_difficultyPrefix))
                    return (hash, nonce);
                nonce++;
            }
        }

        // ════════════════════════════════════════════════════════
        //  Merkle Root (public so TransactionController can verify)
        // ════════════════════════════════════════════════════════
        public string ComputeMerkleRoot(DrugTransaction t)
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
                    var left  = level[i];
                    var right = i + 1 < level.Count ? level[i + 1] : left;
                    next.Add(ComputeSHA256(left + right));
                }
                level = next;
            }
            return level[0][..16];
        }

        // ════════════════════════════════════════════════════════
        //  SHA-256 helper (public for chain-verify)
        // ════════════════════════════════════════════════════════
        public string ComputeSHA256(string input)
        {
            using var sha256 = SHA256.Create();
            var bytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(input));
            return Convert.ToHexString(bytes);
        }
    }
}
