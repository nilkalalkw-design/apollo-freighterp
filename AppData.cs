using System.Collections.ObjectModel;
using System.IO;
using System.Text.Json;

namespace ApolloFreightERP;

public static class AppData
{
    public static ObservableCollection<Shipment> Shipments { get; } = new();
    public static ObservableCollection<ConsolidationLoad> Loads { get; } = new();
    public static ObservableCollection<Party> Customers { get; } = new();
    public static ObservableCollection<Party> Suppliers { get; } = new();
    public static ObservableCollection<Tariff> Tariffs { get; } = new();
    public static ObservableCollection<DocumentItem> Documents { get; } = new();
    public static ObservableCollection<Invoice> Invoices { get; } = new();
    public static ObservableCollection<AuditEntry> Audit { get; } = new();
    public static ObservableCollection<UserAccount> Users { get; } = new();
    public static ObservableCollection<UnblockRequest> UnblockRequests { get; } = new();
    public static ObservableCollection<AdminRequest> AdminRequests { get; } = new();
    public static ObservableCollection<CustomerDeposit> CustomerDeposits { get; } = new();
    public static DemoSettings Settings { get; } = new();

    public static UserAccount? CurrentUser { get; set; }
    public static bool IsSeeded { get; private set; }

    private static string DataFilePath => Path.Combine(AppContext.BaseDirectory, "demo-data.json");
    private static string OldUserFilePath => Path.Combine(AppContext.BaseDirectory, "demo-users.json");

    public static void SeedUsers()
    {
        SeedDemoData();
    }

    public static void SeedDemoData()
    {
        if (IsSeeded)
        {
            return;
        }

        if (File.Exists(DataFilePath))
        {
            var state = JsonSerializer.Deserialize<DemoState>(File.ReadAllText(DataFilePath)) ?? new DemoState();
            LoadCollection(Shipments, state.Shipments);
            LoadCollection(Loads, state.Loads);
            LoadCollection(Customers, state.Customers);
            LoadCollection(Suppliers, state.Suppliers);
            LoadCollection(Tariffs, state.Tariffs);
            LoadCollection(Documents, state.Documents);
            LoadCollection(Invoices, state.Invoices);
            LoadCollection(Audit, state.Audit);
            LoadCollection(Users, state.Users);
            LoadCollection(UnblockRequests, state.UnblockRequests);
            LoadCollection(AdminRequests, state.AdminRequests);
            LoadCollection(CustomerDeposits, state.CustomerDeposits);
            CopySettings(state.Settings ?? new DemoSettings());
            NormalizeLoadedData();
            IsSeeded = true;
            return;
        }

        SeedDefaults();

        if (File.Exists(OldUserFilePath))
        {
            var savedUsers = JsonSerializer.Deserialize<List<UserAccount>>(File.ReadAllText(OldUserFilePath)) ?? [];
            foreach (var user in savedUsers.Where(user => Users.All(existing => existing.UserName != user.UserName)))
            {
                Users.Add(user);
            }
        }

        SaveAll();
        IsSeeded = true;
    }

    private static void NormalizeLoadedData()
    {
        if (Settings.CompanyName.Contains("SOLUTION", StringComparison.OrdinalIgnoreCase) &&
            !Settings.CompanyName.Contains("SOLUTIONS", StringComparison.OrdinalIgnoreCase))
        {
            Settings.CompanyName = "APOLLO FREIGHT SOLUTIONS";
        }

        foreach (var tariff in Tariffs.Where(t => string.IsNullOrWhiteSpace(t.CreatedBy)))
        {
            tariff.CreatedBy = "admin";
        }

        foreach (var invoice in Invoices.Where(i => string.IsNullOrWhiteSpace(i.CreatedBy)))
        {
            invoice.CreatedBy = "admin";
        }

        foreach (var shipment in Shipments.Where(s => string.IsNullOrWhiteSpace(s.CreatedBy) || s.CreatedBy == "admin"))
        {
            shipment.CreatedBy = shipment.Branch == "Branch 2" ? "billing-branch2" : "ops-branch1";
        }
    }

    public static void SaveUsers()
    {
        SaveAll();
    }

    public static void SaveAll()
    {
        var state = new DemoState
        {
            Shipments = Shipments.ToList(),
            Loads = Loads.ToList(),
            Customers = Customers.ToList(),
            Suppliers = Suppliers.ToList(),
            Tariffs = Tariffs.ToList(),
            Documents = Documents.ToList(),
            Invoices = Invoices.ToList(),
            Audit = Audit.ToList(),
            Users = Users.ToList(),
            UnblockRequests = UnblockRequests.ToList(),
            AdminRequests = AdminRequests.ToList(),
            CustomerDeposits = CustomerDeposits.ToList(),
            Settings = Settings
        };

        var json = JsonSerializer.Serialize(state, new JsonSerializerOptions { WriteIndented = true });
        File.WriteAllText(DataFilePath, json);
    }

    private static void SeedDefaults()
    {
        Customers.Add(new Party("CUS-001", "Gulf Retail Trading", "Kuwait City", "ops@gulf-retail.example", "30 days", "Active", false, "Branch 1"));
        Customers.Add(new Party("CUS-002", "Desert Medical Supplies", "Shuwaikh", "logistics@desert-med.example", "15 days", "Active", true, "Branch 2"));
        Customers.Add(new Party("CUS-003", "Al Noor Projects", "Ahmadi", "cargo@alnoor.example", "45 days", "Active", false, "Branch 1"));

        Suppliers.Add(new Party("TRN-001", "Al Dana Transport", "Kuwait - Riyadh", "dispatch@aldana.example", "20 days", "Active", false, "Branch 1"));
        Suppliers.Add(new Party("TRN-002", "Falcon Line Haul", "Kuwait - Dammam", "ops@falconline.example", "30 days", "Active", false, "Branch 2"));
        Suppliers.Add(new Party("TRN-003", "Blue Road Logistics", "Kuwait - Doha", "desk@blueroad.example", "15 days", "Active", false, "Both"));

        Tariffs.Add(new Tariff("TAR-1001", "Gulf Retail Trading", "Kuwait City", "Riyadh", "FTL", "Minimum", "Per KG", 0.42m, 35m, 5000, "2026-01-01", "2026-12-31"));
        Tariffs.Add(new Tariff("TAR-1002", "Desert Medical Supplies", "Shuwaikh", "Dammam", "LTL", "Up to 300 KG", "Per CBM", 18m, 55m, 5000, "2026-01-01", "2026-06-30"));
        Tariffs.Add(new Tariff("TAR-1003", "Al Noor Projects", "Ahmadi", "Doha", "FTL", "More", "Per Trip", 650m, 650m, 5000, "2026-02-01", "2026-12-31"));

        Shipments.Add(new Shipment("AFS-2605001", "Branch 1", "Gulf Retail Trading", "Kuwait City", "Riyadh", "Booked", 14, 820, 5.2, 1040, 485m, 330m, "Pending", "Unbilled", 3, "", "AWB-2605001", "TAR-1001", "ops-branch1"));
        Shipments.Add(new Shipment("AFS-2605002", "Branch 2", "Desert Medical Supplies", "Shuwaikh", "Dammam", "In-Transit", 8, 410, 2.1, 420, 215m, 150m, "Pending", "Unbilled", 2, "", "AWB-2605002", "TAR-1002", "billing-branch2"));
        Shipments.Add(new Shipment("AFS-2605003", "Branch 1", "Al Noor Projects", "Ahmadi", "Doha", "Delivered", 22, 1250, 7.8, 1560, 780m, 590m, "Missing", "Unbilled", 4, "", "AWB-2605003", "TAR-1003", "ops-branch1"));
        Shipments.Add(new Shipment("AFS-2605004", "Branch 1", "Gulf Retail Trading", "Kuwait City", "Riyadh", "Invoiced", 4, 160, 0.9, 180, 95m, 70m, "Uploaded", "INV-260001", 3, "", "AWB-2605004", "TAR-1001", "ops-branch1"));
        Shipments.Add(new Shipment("AFS-2605005", "Branch 2", "Desert Medical Supplies", "Shuwaikh", "Dammam", "Draft", 11, 0, 3.4, 680, 0m, 0m, "Pending", "Missing rate", 2, "", "AWB-2605005", "TAR-1002", "billing-branch2"));

        Loads.Add(new ConsolidationLoad("CON-260501", "Kuwait - Riyadh", "Al Dana Transport", "KWT-49217", "Dispatched", 18, 980, 6.1, 1220, "AFS-2605001, AFS-2605004", "2026-05-05"));
        Loads.Add(new ConsolidationLoad("CON-260502", "Kuwait - Dammam", "Falcon Line Haul", "KWT-77320", "Planned", 19, 620, 5.5, 1100, "AFS-2605002, AFS-2605005", "2026-05-06"));

        CustomerDeposits.Add(new CustomerDeposit("DEP-2605001", "Gulf Retail Trading", "2026-05-01", 1500m, 450m, "Freight deposit", 1050m, "Branch 1"));
        CustomerDeposits.Add(new CustomerDeposit("DEP-2605002", "Desert Medical Supplies", "2026-05-03", 900m, 0m, "Credit security", 900m, "Branch 2"));

        Documents.Add(new DocumentItem("DOC-001", "AFS-2605001", "Waybill", "Issued", "2026-05-05", "operations"));
        Documents.Add(new DocumentItem("DOC-002", "AFS-2605003", "POD", "Missing", "2026-05-04", "delivery"));
        Documents.Add(new DocumentItem("DOC-003", "AFS-2605004", "Customer Invoice", "Stored", "2026-05-02", "billing"));

        Invoices.Add(new Invoice("INV-260001", "Gulf Retail Trading", "AFS-2605004", 95m, 70m, "Sent", "2026-05-02"));
        Invoices.Add(new Invoice("DRAFT-260006", "Al Noor Projects", "AFS-2605003", 780m, 590m, "Draft", "2026-05-05"));

        Audit.Add(new AuditEntry("2026-05-05 09:15", "operations", "Created shipment", "AFS-2605001"));
        Audit.Add(new AuditEntry("2026-05-05 10:05", "billing", "Generated invoice", "INV-260001"));
        Audit.Add(new AuditEntry("2026-05-05 10:22", "admin", "Rate override warning reviewed", "AFS-2605005"));

        Users.Add(new UserAccount("admin", "admin@apollofreightsolution.com", "Admin", "Active", "Both", "admin123", true, true, true, true, "System temporary admin"));
        Users.Add(new UserAccount("ops-branch1", "operations.branch1@apollofreightsolution.com", "Operations", "Active", "Branch 1", "ops123", true, false, false, false, "Can create and track Branch 1 shipments"));
        Users.Add(new UserAccount("billing-branch2", "billing.branch2@apollofreightsolution.com", "Billing", "Active", "Branch 2", "billing123", true, false, true, true, "Invoice and finance access for Branch 2"));

        Settings.CompanyName = "APOLLO FREIGHT SOLUTIONS";
        Settings.ShipmentNumberFormat = "AFS-YYMM####";
        Settings.InvoiceNumberFormat = "INV-YY####";
        Settings.DefaultVolumetricDivisor = "5000";
        Settings.RequirePodBeforeInvoice = "Yes";
        Settings.Branches = "Branch 1, Branch 2";
        Settings.StatusMasters = "Draft, Booked, In-Transit, Delivered, Invoiced, Closed, Blocked";
        Settings.LogoFile = "Assets/logo.png";
    }

    private static void LoadCollection<T>(ObservableCollection<T> target, IEnumerable<T> source)
    {
        target.Clear();
        foreach (var item in source)
        {
            target.Add(item);
        }
    }

    private static void CopySettings(DemoSettings source)
    {
        Settings.CompanyName = source.CompanyName;
        Settings.ShipmentNumberFormat = source.ShipmentNumberFormat;
        Settings.InvoiceNumberFormat = source.InvoiceNumberFormat;
        Settings.DefaultVolumetricDivisor = source.DefaultVolumetricDivisor;
        Settings.RequirePodBeforeInvoice = source.RequirePodBeforeInvoice;
        Settings.Branches = source.Branches;
        Settings.StatusMasters = source.StatusMasters;
        Settings.LogoFile = source.LogoFile;
    }
}

public class DemoState
{
    public List<Shipment> Shipments { get; set; } = [];
    public List<ConsolidationLoad> Loads { get; set; } = [];
    public List<Party> Customers { get; set; } = [];
    public List<Party> Suppliers { get; set; } = [];
    public List<Tariff> Tariffs { get; set; } = [];
    public List<DocumentItem> Documents { get; set; } = [];
    public List<Invoice> Invoices { get; set; } = [];
    public List<AuditEntry> Audit { get; set; } = [];
    public List<UserAccount> Users { get; set; } = [];
    public List<UnblockRequest> UnblockRequests { get; set; } = [];
    public List<AdminRequest> AdminRequests { get; set; } = [];
    public List<CustomerDeposit> CustomerDeposits { get; set; } = [];
    public DemoSettings Settings { get; set; } = new();
}

public class DemoSettings
{
    public string CompanyName { get; set; } = "APOLLO FREIGHT SOLUTIONS";
    public string ShipmentNumberFormat { get; set; } = "AFS-YYMM####";
    public string InvoiceNumberFormat { get; set; } = "INV-YY####";
    public string DefaultVolumetricDivisor { get; set; } = "5000";
    public string RequirePodBeforeInvoice { get; set; } = "Yes";
    public string Branches { get; set; } = "Branch 1, Branch 2";
    public string StatusMasters { get; set; } = "Draft, Booked, In-Transit, Delivered, Invoiced, Closed, Blocked";
    public string LogoFile { get; set; } = "Assets/logo.png";
}
