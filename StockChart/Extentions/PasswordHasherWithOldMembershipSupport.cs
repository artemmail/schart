using Microsoft.AspNetCore.Identity;
using StockChart.Model;
using System.Text;
using System.Security.Cryptography;
public class PasswordHasherWithOldMembershipSupport : IPasswordHasher<ApplicationUser>
{
    //an instance of the default password hasher
    IPasswordHasher<ApplicationUser> _identityPasswordHasher = new PasswordHasher<ApplicationUser>();
    //the passwords of the new users will be hashed with new algorithm
    public string HashPassword(ApplicationUser user, string password)
    {
        return _identityPasswordHasher.HashPassword(user, password);
    }
    private string EncodePassword(string pass, string salt)
    {
        byte[] bIn = Encoding.Unicode.GetBytes(pass);
        byte[] bSalt = Convert.FromBase64String(salt);
        HashAlgorithm hm = HashAlgorithm.Create("SHA1");
        byte[] bAll = new byte[bSalt.Length + bIn.Length];
        Buffer.BlockCopy(bSalt, 0, bAll, 0, bSalt.Length);
        Buffer.BlockCopy(bIn, 0, bAll, bSalt.Length, bIn.Length);
        byte[] bRet = hm.ComputeHash(bAll);
        return Convert.ToBase64String(bRet);
    }
    public PasswordVerificationResult VerifyHashedPassword(ApplicationUser user,
                string hashedPassword, string providedPassword)
    {
        if (hashedPassword.Length == 28+24) {
            var hash = hashedPassword.Substring(0, 28);
            var salt = hashedPassword.Substring(28);
            var pwdHash2 = EncodePassword(providedPassword, salt);
            if (hash == pwdHash2)
                return PasswordVerificationResult.Success;
        }
        if (hashedPassword == providedPassword)
        {
            //first we check the hashed password with "old" hash
            return PasswordVerificationResult.Success;
        }
        else
        {
            //if old hash doesn't work - use the default approach 
            return _identityPasswordHasher.VerifyHashedPassword(user, hashedPassword, providedPassword);
        }
    }
}
