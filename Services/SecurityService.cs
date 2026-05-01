namespace PharmaChain.Services
{
    public class SecurityService
    {
        private static readonly Dictionary<string, (int attempts, DateTime lockUntil)> _loginAttempts = new();

        public bool IsBlocked(string username)
        {
            if (!_loginAttempts.ContainsKey(username)) return false;
            var (attempts, lockUntil) = _loginAttempts[username];
            if (lockUntil > DateTime.UtcNow) return true;
            return false;
        }

        public int GetAttempts(string username)
        {
            if (!_loginAttempts.ContainsKey(username)) return 0;
            return _loginAttempts[username].attempts;
        }

        public void RecordFailedAttempt(string username)
        {
            if (!_loginAttempts.ContainsKey(username))
                _loginAttempts[username] = (1, DateTime.MinValue);
            else
            {
                var (attempts, _) = _loginAttempts[username];
                if (attempts + 1 >= 5)
                    _loginAttempts[username] = (5, DateTime.UtcNow.AddMinutes(5));
                else
                    _loginAttempts[username] = (attempts + 1, DateTime.MinValue);
            }
        }

        public void ResetAttempts(string username)
        {
            _loginAttempts.Remove(username);
        }

        public bool IsPasswordStrong(string password)
        {
            if (password.Length < 8) return false;
            if (!password.Any(char.IsDigit)) return false;
            if (!password.Any(char.IsUpper)) return false;
            return true;
        }
    }
}