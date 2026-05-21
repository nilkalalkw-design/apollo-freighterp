using System.IO;
using System.Windows;
using System.Windows.Media.Imaging;

namespace ApolloFreightERP;

public partial class LoginWindow : Window
{
    public LoginWindow()
    {
        InitializeComponent();
        AppData.SeedUsers();
        LoadCompanyLogo();
    }

    private void Login_Click(object sender, RoutedEventArgs e)
    {
        var user = AppData.Users.FirstOrDefault(account =>
            account.UserName.Equals(UserNameBox.Text.Trim(), StringComparison.OrdinalIgnoreCase) &&
            account.Password == PasswordBox.Password &&
            account.AccountStatus == "Active");

        if (user is not null)
        {
            AppData.CurrentUser = user;
            var mainWindow = new MainWindow(user);
            mainWindow.Show();
            Close();
            return;
        }

        LoginMessage.Text = "Invalid user name/password, or user account is not active.";
    }

    private void ResetPassword_Click(object sender, RoutedEventArgs e)
    {
        var email = ResetEmailBox.Text.Trim();
        if (string.IsNullOrWhiteSpace(email) || !email.Contains('@'))
        {
            MessageBox.Show("Enter a valid email address.", "Password reset", MessageBoxButton.OK, MessageBoxImage.Warning);
            return;
        }

        MessageBox.Show($"Password reset request recorded for {email}. Email sending will be connected in the live server version.", "Password reset", MessageBoxButton.OK, MessageBoxImage.Information);
    }

    private void LoadCompanyLogo()
    {
        var baseDir = AppContext.BaseDirectory;
        var candidates = new[]
        {
            Path.Combine(baseDir, "Assets", "logo.png"),
            Path.Combine(baseDir, "Assets", "logo.jpg"),
            Path.Combine(baseDir, "Assets", "logo.jpeg"),
            Path.Combine(baseDir, "Assets", "company-logo.png"),
            Path.Combine(baseDir, "Assets", "company-logo.jpg"),
            Path.Combine(baseDir, "Assets", "company-logo.jpeg")
        };

        var logoPath = candidates.FirstOrDefault(File.Exists);
        if (logoPath is null)
        {
            return;
        }

        LogoImage.Source = new BitmapImage(new Uri(logoPath, UriKind.Absolute));
        LogoImage.Visibility = Visibility.Visible;
        AfsFallback.Visibility = Visibility.Collapsed;
    }
}
