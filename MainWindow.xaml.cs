using System.Collections;
using System.Collections.ObjectModel;
using System.Globalization;
using System.IO;
using System.Reflection;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Controls.Primitives;
using System.Windows.Data;
using System.Windows.Input;
using System.Windows.Media;
using System.Windows.Media.Imaging;
using Microsoft.Win32;
using System.Diagnostics;

namespace ApolloFreightERP;

public partial class MainWindow : Window
{
    private readonly ObservableCollection<Shipment> _shipments = AppData.Shipments;
    private readonly ObservableCollection<ConsolidationLoad> _loads = AppData.Loads;
    private readonly ObservableCollection<Party> _customers = AppData.Customers;
    private readonly ObservableCollection<Party> _suppliers = AppData.Suppliers;
    private readonly ObservableCollection<Tariff> _tariffs = AppData.Tariffs;
    private readonly ObservableCollection<DocumentItem> _documents = AppData.Documents;
    private readonly ObservableCollection<Invoice> _invoices = AppData.Invoices;
    private readonly ObservableCollection<AuditEntry> _audit = AppData.Audit;
    private readonly ObservableCollection<UserAccount> _users = AppData.Users;
    private readonly ObservableCollection<UnblockRequest> _unblockRequests = AppData.UnblockRequests;
    private readonly ObservableCollection<AdminRequest> _adminRequests = AppData.AdminRequests;
    private readonly ObservableCollection<CustomerDeposit> _customerDeposits = AppData.CustomerDeposits;
    private readonly UserAccount _currentUser;
    private bool _adminRequestNoticeShown;
    private readonly string[] _modules =
    [
        "Dashboard",
        "Shipments / Jobs",
        "Consolidation",
        "Customers",
        "Suppliers / Transporters",
        "Tariffs / Rate Master",
        "Documents",
        "Billing / Invoices",
        "POD / Delivery",
        "Shipment Status",
        "Reports",
        "User Management / Settings",
        "Audit Log"
    ];

    public MainWindow() : this(GetDefaultUser())
    {
    }

    public MainWindow(UserAccount currentUser)
    {
        InitializeComponent();
        AppData.SeedUsers();
        _currentUser = currentUser;
        LoadCompanyLogo();
        UserContextText.Text = $"User: {_currentUser.UserName} | Role: {_currentUser.Role} | Branch: {_currentUser.BranchAccess}";
        UpdateDateFilterStatus();
        NavigationList.ItemsSource = _modules;
        NavigationList.SelectedIndex = 0;
        Loaded += (_, _) => ShowAdminRequestNotificationIfNeeded();
    }

    private static UserAccount GetDefaultUser()
    {
        AppData.SeedUsers();
        return AppData.CurrentUser ?? AppData.Users.First();
    }

    private void SeedData()
    {
        if (_shipments.Count > 0)
        {
            return;
        }
        _customers.Add(new Party("CUS-001", "Gulf Retail Trading", "Kuwait City", "ops@gulf-retail.example", "30 days", "Active", false, "Branch 1"));
        _customers.Add(new Party("CUS-002", "Desert Medical Supplies", "Shuwaikh", "logistics@desert-med.example", "15 days", "Active", true, "Branch 2"));
        _customers.Add(new Party("CUS-003", "Al Noor Projects", "Ahmadi", "cargo@alnoor.example", "45 days", "Active", false, "Branch 1"));

        _suppliers.Add(new Party("TRN-001", "Al Dana Transport", "Kuwait - Riyadh", "dispatch@aldana.example", "20 days", "Active", false, "Branch 1"));
        _suppliers.Add(new Party("TRN-002", "Falcon Line Haul", "Kuwait - Dammam", "ops@falconline.example", "30 days", "Active", false, "Branch 2"));
        _suppliers.Add(new Party("TRN-003", "Blue Road Logistics", "Kuwait - Doha", "desk@blueroad.example", "15 days", "Active", false, "Both"));

        _tariffs.Add(new Tariff("TAR-1001", "Gulf Retail Trading", "Kuwait City", "Riyadh", "FTL", "Minimum", "Per KG", 0.42m, 35m, 5000, "2026-01-01", "2026-12-31"));
        _tariffs.Add(new Tariff("TAR-1002", "Desert Medical Supplies", "Shuwaikh", "Dammam", "LTL", "Up to 300 KG", "Per CBM", 18m, 55m, 5000, "2026-01-01", "2026-06-30"));
        _tariffs.Add(new Tariff("TAR-1003", "Al Noor Projects", "Ahmadi", "Doha", "FTL", "More", "Per Trip", 650m, 650m, 5000, "2026-02-01", "2026-12-31"));

        _shipments.Add(new Shipment("AFS-2605001", "Branch 1", "Gulf Retail Trading", "Kuwait City", "Riyadh", "Booked", 14, 820, 5.2, 1040, 485m, 330m, "Pending", "Unbilled", 3));
        _shipments.Add(new Shipment("AFS-2605002", "Branch 2", "Desert Medical Supplies", "Shuwaikh", "Dammam", "In-Transit", 8, 410, 2.1, 420, 215m, 150m, "Pending", "Unbilled", 2));
        _shipments.Add(new Shipment("AFS-2605003", "Branch 1", "Al Noor Projects", "Ahmadi", "Doha", "Delivered", 22, 1250, 7.8, 1560, 780m, 590m, "Missing", "Unbilled", 4));
        _shipments.Add(new Shipment("AFS-2605004", "Branch 1", "Gulf Retail Trading", "Kuwait City", "Riyadh", "Invoiced", 4, 160, 0.9, 180, 95m, 70m, "Uploaded", "INV-260001", 3));
        _shipments.Add(new Shipment("AFS-2605005", "Branch 2", "Desert Medical Supplies", "Shuwaikh", "Dammam", "Draft", 11, 0, 3.4, 680, 0m, 0m, "Pending", "Missing rate", 2));

        _loads.Add(new ConsolidationLoad("CON-260501", "Kuwait - Riyadh", "Al Dana Transport", "KWT-49217", "Dispatched", 18, 980, 6.1, 1220, string.Empty, "2026-05-05"));
        _loads.Add(new ConsolidationLoad("CON-260502", "Kuwait - Dammam", "Falcon Line Haul", "KWT-77320", "Planned", 19, 620, 5.5, 1100, string.Empty, "2026-05-06"));

        _documents.Add(new DocumentItem("DOC-001", "AFS-2605001", "Waybill", "Issued", "2026-05-05", "operations"));
        _documents.Add(new DocumentItem("DOC-002", "AFS-2605003", "POD", "Missing", "2026-05-04", "delivery"));
        _documents.Add(new DocumentItem("DOC-003", "AFS-2605004", "Customer Invoice", "Stored", "2026-05-02", "billing"));

        _invoices.Add(new Invoice("INV-260001", "Gulf Retail Trading", "AFS-2605004", 95m, 70m, "Sent", "2026-05-02"));
        _invoices.Add(new Invoice("DRAFT-260006", "Al Noor Projects", "AFS-2605003", 780m, 590m, "Draft", "2026-05-05"));

        _audit.Add(new AuditEntry("2026-05-05 09:15", "operations", "Created shipment", "AFS-2605001"));
        _audit.Add(new AuditEntry("2026-05-05 10:05", "billing", "Generated invoice", "INV-260001"));
        _audit.Add(new AuditEntry("2026-05-05 10:22", "admin", "Rate override warning reviewed", "AFS-2605005"));

    }

    private void NavigationList_SelectionChanged(object sender, SelectionChangedEventArgs e)
    {
        if (NavigationList.SelectedItem is not string module)
        {
            return;
        }

        if (module == "User Management / Settings" && !IsAdmin())
        {
            MessageBox.Show("Only admin users can open User Management / Settings.", "Access denied", MessageBoxButton.OK, MessageBoxImage.Warning);
            NavigationList.SelectedItem = "Dashboard";
            return;
        }

        PageTitle.Text = module;
        HeaderDateFilterPanel.Visibility = module == "Reports" ? Visibility.Collapsed : Visibility.Visible;
        PageSubtitle.Text = module switch
        {
            "Dashboard" => "Live operational summary for land freight consolidation",
            "Shipments / Jobs" => "Create, price, track, duplicate, and close cargo jobs",
            "Consolidation" => "Build trips, manifests, and loading lists",
            "Tariffs / Rate Master" => "Customer, lane, service, vehicle, and surcharge rates",
            "Billing / Invoices" => "Invoice shipments, monitor unbilled jobs, and check margins",
            "POD / Delivery" => "Delivery status, POD uploads, disputes, and pending lists",
            "Shipment Status" => "Dedicated shipment status updates and history controls",
            _ => "Master data, controls, reporting, and audit visibility"
        };

        MainContent.Content = BuildModuleContent(module);
        UpdateDateFilterStatus();
    }

    private UIElement BuildModuleContent(string module)
    {
        return module switch
        {
            "Dashboard" => BuildDashboard(),
            "Shipments / Jobs" => BuildShipments(),
            "Consolidation" => BuildConsolidation(),
            "Customers" => BuildPartyMaster(_customers, "Customer"),
            "Suppliers / Transporters" => BuildPartyMaster(_suppliers, "Supplier / Transporter"),
            "Tariffs / Rate Master" => BuildTariffs(),
            "Documents" => BuildDocuments(),
            "Billing / Invoices" => BuildInvoices(),
            "POD / Delivery" => BuildPod(),
            "Shipment Status" => BuildShipmentStatus(),
            "Reports" => BuildReports(),
            "User Management / Settings" => IsAdmin() ? BuildSettings() : Panel("Access Denied", new TextBlock { Text = "Only admin users can access user management and settings." }),
            "Audit Log" => BuildAudit(),
            _ => BuildDashboard()
        };
    }

    private void ApplyDateFilter_Click(object sender, RoutedEventArgs e)
    {
        RefreshCurrentModule();
    }

    private void ClearDateFilter_Click(object sender, RoutedEventArgs e)
    {
        FromDateFilter.SelectedDate = null;
        ToDateFilter.SelectedDate = null;
        RefreshCurrentModule();
    }

    private void RefreshCurrentModule()
    {
        if (NavigationList.SelectedItem is not string module)
        {
            return;
        }

        MainContent.Content = BuildModuleContent(module);
        UpdateDateFilterStatus();
    }

    private void UpdateDateFilterStatus()
    {
        var from = FromDateFilter.SelectedDate?.ToString("yyyy-MM-dd") ?? "Any";
        var to = ToDateFilter.SelectedDate?.ToString("yyyy-MM-dd") ?? "Any";
        DateFilterStatusText.Text = $"Showing records from {from} to {to}";
    }

    private UIElement BuildDashboard()
    {
        var visibleShipments = ApplyDateRangeFilter(DashboardShipments()).ToList();
        var visibleDeposits = ApplyDateRangeFilter(VisibleCustomerDeposits()).ToList();
        var grid = new Grid();
        grid.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });
        grid.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });
        grid.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });

        var kpis = new UniformGrid { Columns = 4, Margin = new Thickness(0, 0, 0, 18) };
        kpis.Children.Add(KpiCard("Open Shipments", visibleShipments.Count(s => s.Status is "Draft" or "Booked").ToString(), "Draft and booked jobs", "#F58220"));
        kpis.Children.Add(KpiCard("In Transit", visibleShipments.Count(s => s.Status == "In-Transit").ToString(), "Currently moving", "#425E7B"));
        kpis.Children.Add(KpiCard("Pending POD", visibleShipments.Count(s => s.PodStatus != "Uploaded").ToString(), "Need delivery proof", "#C26A2C"));
        kpis.Children.Add(KpiCard("Unbilled", visibleShipments.Count(s => s.InvoiceStatus is "Unbilled" or "Missing rate").ToString(), "Ready for billing review", "#8E3B46"));
        kpis.Children.Add(KpiCard("Today Bookings", visibleShipments.Count(s => ParseDate(s.BookingDate, out var bookingDate) && bookingDate.Date == DateTime.Today).ToString(), "Created today", "#3F6B57"));
        if (!IsAdmin())
        {
            grid.Children.Add(kpis);
            return grid;
        }

        kpis.Children.Add(KpiCard("Month Revenue", Money(visibleShipments.Sum(s => s.Sell)), "Sell total", "#2F5D62"));
        kpis.Children.Add(KpiCard("Gross Profit", Money(visibleShipments.Sum(s => s.Sell - s.BuyCost)), "Sell minus supplier cost", "#475B63"));
        kpis.Children.Add(KpiCard("Deposit Balance", Money(visibleDeposits.Sum(d => d.Balance)), "Customer deposits", "#5B6F35"));
        grid.Children.Add(kpis);

        var lower = new Grid { Margin = new Thickness(0, 4, 0, 0) };
        lower.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(2, GridUnitType.Star) });
        lower.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
        Grid.SetRow(lower, 1);

        lower.Children.Add(Panel("Operational Shipments", DataGridFor(visibleShipments, 290, false)));
        Grid.SetColumn(lower.Children[^1], 0);

        var alerts = new StackPanel();
        alerts.Children.Add(Alert("Jobs missing tariff/rate", "AFS-2605005 needs tariff selection before invoice."));
        alerts.Children.Add(Alert("Delivered but not invoiced", "AFS-2605003 is delivered and waiting for billing."));
        alerts.Children.Add(Alert("Pending POD", "3 shipments need POD upload or dispute update."));
        alerts.Children.Add(Alert("Supplier cost check", "Review cost before approving draft invoice."));
        lower.Children.Add(Panel("Exception Alerts", alerts));
        Grid.SetColumn(lower.Children[^1], 1);
        grid.Children.Add(lower);

        var actions = new UniformGrid { Columns = 4, Margin = new Thickness(0, 18, 0, 0) };
        actions.Children.Add(ActionButton("Create Shipment", () => NavigationList.SelectedItem = "Shipments / Jobs"));
        actions.Children.Add(ActionButton("Upload Document", () => NavigationList.SelectedItem = "Documents"));
        actions.Children.Add(ActionButton("Create Consolidation", () => NavigationList.SelectedItem = "Consolidation"));
        actions.Children.Add(ActionButton("Generate Invoice", () => NavigationList.SelectedItem = "Billing / Invoices"));
        Grid.SetRow(actions, 2);
        grid.Children.Add(actions);

        return grid;
    }

    private UIElement BuildShipments()
    {
        var root = TwoColumnLayout();
        var visibleShipments = VisibleShipments().ToList();
        var filteredShipments = ApplyDateRangeFilter(visibleShipments).ToList();
        var searchBox = new ComboBox { ItemsSource = visibleShipments.Select(s => s.JobNo).ToList(), IsEditable = true, Padding = new Thickness(8), BorderBrush = Brush("#C7D2DE"), MinWidth = 180 };
        var shipmentGrid = DataGridFor(filteredShipments, 420, false);
        var shipmentPanel = new StackPanel();
        shipmentPanel.Children.Add(new TextBlock { Text = "Edit previous entries directly in the grid. Select a row to delete, then save changes.", Foreground = Brush("#687582"), Margin = new Thickness(0, 0, 0, 8) });
        shipmentPanel.Children.Add(shipmentGrid);
        var shipmentButtons = new StackPanel { Orientation = Orientation.Horizontal, Margin = new Thickness(0, 12, 0, 0) };
        shipmentButtons.Children.Add(ActionButton("Save Changes", () =>
        {
            if (!ValidateAllUniqueNumbers(out var message))
            {
                MessageBox.Show(message, "Duplicate entry", MessageBoxButton.OK, MessageBoxImage.Warning);
                return;
            }

            AddHistory("Edited shipment register", "Shipments / Jobs");
        }));
        shipmentButtons.Children.Add(ActionButton("Delete Selected Shipment", () =>
        {
            if (shipmentGrid.SelectedItem is not Shipment selected)
            {
                MessageBox.Show("Select a shipment row first.", "Apollo Freight ERP", MessageBoxButton.OK, MessageBoxImage.Warning);
                return;
            }

            _shipments.Remove(selected);
            AddHistory("Deleted shipment", selected.JobNo);
            NavigationList.SelectedItem = "Shipments / Jobs";
        }));
        shipmentPanel.Children.Add(shipmentButtons);
        root.Children.Add(Panel("Shipment Register", shipmentPanel));
        Grid.SetColumn(root.Children[^1], 0);

        var customer = new ComboBox { ItemsSource = VisibleParties(_customers).Select(c => c.Name).ToList(), IsEditable = true, Padding = new Thickness(8), BorderBrush = Brush("#C7D2DE") };
        customer.SelectedIndex = customer.Items.Count > 0 ? 0 : -1;
        var branchOptions = _currentUser.BranchAccess == "Both" ? new[] { "Branch 1", "Branch 2" } : new[] { _currentUser.BranchAccess };
        var branch = new ComboBox { ItemsSource = branchOptions, SelectedIndex = 0, IsEnabled = _currentUser.BranchAccess == "Both", Padding = new Thickness(8), BorderBrush = Brush("#C7D2DE") };
        var origin = new ComboBox { ItemsSource = new[] { "Kuwait City", "Shuwaikh", "Ahmadi", "Riyadh", "Dammam", "Doha" }, SelectedIndex = 0, IsEditable = true, Padding = new Thickness(8), BorderBrush = Brush("#C7D2DE") };
        var destination = new ComboBox { ItemsSource = new[] { "Riyadh", "Dammam", "Doha", "Kuwait City", "Shuwaikh", "Ahmadi" }, SelectedIndex = 0, IsEditable = true, Padding = new Thickness(8), BorderBrush = Brush("#C7D2DE") };
        var pieces = new TextBox { Text = "1", Padding = new Thickness(8), BorderBrush = Brush("#C7D2DE") };
        var pallets = new TextBox { Text = "1", Padding = new Thickness(8), BorderBrush = Brush("#C7D2DE") };
        var actual = new TextBox { Text = "100", Padding = new Thickness(8), BorderBrush = Brush("#C7D2DE") };
        var cbm = new TextBox { Text = "1.0", Padding = new Thickness(8), BorderBrush = Brush("#C7D2DE") };
        var chargeable = new TextBox { Text = "200", Padding = new Thickness(8), BorderBrush = Brush("#C7D2DE") };
        var sell = new TextBox { Text = "100.000", Padding = new Thickness(8), BorderBrush = Brush("#C7D2DE") };
        var cost = new TextBox { Text = "70.000", Padding = new Thickness(8), BorderBrush = Brush("#C7D2DE") };
        var jobNumber = new TextBox { Text = NextAvailableNumber("AFS"), IsReadOnly = true, Padding = new Thickness(8), BorderBrush = Brush("#C7D2DE"), Background = Brush("#F7FAFC") };
        var airwayBillNo = new TextBox { Text = NextAvailableNumber("AWB"), Padding = new Thickness(8), BorderBrush = Brush("#C7D2DE") };
        var tariff = new ComboBox { ItemsSource = VisibleTariffs().Select(TariffLabel).ToList(), IsEditable = true, Padding = new Thickness(8), BorderBrush = Brush("#C7D2DE") };
        var shipmentDirection = new ComboBox { ItemsSource = new[] { "Import", "Export" }, SelectedIndex = 1, Padding = new Thickness(8), BorderBrush = Brush("#C7D2DE") };
        var shipmentService = new ComboBox { ItemsSource = new[] { "Consolidation", "SI", "LI", "AI", "Other" }, SelectedIndex = 0, IsEditable = true, Padding = new Thickness(8), BorderBrush = Brush("#C7D2DE") };
        var shipmentServiceOther = new TextBox { Padding = new Thickness(8), BorderBrush = Brush("#C7D2DE") };
        var transitDays = new ComboBox { ItemsSource = Enumerable.Range(1, 30).Select(day => day.ToString()).ToList(), SelectedIndex = 2, IsEditable = true, Padding = new Thickness(8), BorderBrush = Brush("#C7D2DE") };
        var invoiceAttached = new CheckBox { Content = "Invoice attached", Margin = new Thickness(0, 4, 0, 4) };
        var packingListAttached = new CheckBox { Content = "PL attached", Margin = new Thickness(0, 4, 0, 12) };
        var blockReason = new TextBox { Text = "Missing documents / credit hold / operational hold", Padding = new Thickness(8), BorderBrush = Brush("#C7D2DE") };

        var form = new StackPanel();
        form.Children.Add(new TextBlock { Text = "Search previous shipment here, then update from this same panel.", TextWrapping = TextWrapping.Wrap, Foreground = Brush("#687582"), Margin = new Thickness(0, 0, 0, 8) });
        form.Children.Add(Labelled("Search Job No", searchBox));
        form.Children.Add(ActionButton("Load Shipment", () =>
        {
            var found = _shipments.FirstOrDefault(s => s.JobNo.Equals(ComboText(searchBox), StringComparison.OrdinalIgnoreCase));
            if (found is null)
            {
                MessageBox.Show("Shipment not found.", "Apollo Freight ERP", MessageBoxButton.OK, MessageBoxImage.Warning);
                return;
            }

            jobNumber.Text = found.JobNo;
            airwayBillNo.Text = found.AirwayBillNo;
            tariff.Text = found.TariffNo;
            shipmentDirection.SelectedItem = found.ShipmentDirection;
            shipmentService.Text = found.ShipmentService;
            shipmentServiceOther.Text = found.ShipmentServiceOther;
            branch.SelectedItem = branch.Items.Cast<object>().FirstOrDefault(item => item.ToString() == found.Branch) ?? branch.SelectedItem;
            customer.Text = found.Customer;
            origin.Text = found.Origin;
            destination.Text = found.Destination;
            pieces.Text = found.Pieces.ToString(CultureInfo.InvariantCulture);
            pallets.Text = found.Pieces.ToString(CultureInfo.InvariantCulture);
            actual.Text = found.ActualKg.ToString(CultureInfo.InvariantCulture);
            cbm.Text = found.Cbm.ToString(CultureInfo.InvariantCulture);
            chargeable.Text = found.ChargeableKg.ToString(CultureInfo.InvariantCulture);
            transitDays.Text = found.TransitDays.ToString(CultureInfo.InvariantCulture);
            sell.Text = found.Sell.ToString(CultureInfo.InvariantCulture);
            cost.Text = found.BuyCost.ToString(CultureInfo.InvariantCulture);
            shipmentGrid.ItemsSource = new[] { found };
        }));
        form.Children.Add(ActionButton("Update Loaded Shipment", () =>
        {
            var found = _shipments.FirstOrDefault(s => s.JobNo.Equals(ComboText(searchBox), StringComparison.OrdinalIgnoreCase));
            if (found is null)
            {
                MessageBox.Show("Load a shipment first.", "Apollo Freight ERP", MessageBoxButton.OK, MessageBoxImage.Warning);
                return;
            }

            if (_shipments.Any(s => !ReferenceEquals(s, found) && s.AirwayBillNo.Equals(airwayBillNo.Text.Trim(), StringComparison.OrdinalIgnoreCase)))
            {
                MessageBox.Show("Airway bill number already used or duplicate entry.", "Duplicate airway bill", MessageBoxButton.OK, MessageBoxImage.Warning);
                return;
            }

            found.Branch = branch.SelectedItem?.ToString() ?? found.Branch;
            found.Customer = ComboText(customer);
            found.Origin = ComboText(origin);
            found.Destination = ComboText(destination);
            found.Pieces = ToInt(pieces.Text);
            found.ActualKg = Parse(actual.Text);
            found.Cbm = ToDouble(cbm.Text);
            found.ChargeableKg = Parse(chargeable.Text);
            found.TransitDays = ToInt(ComboText(transitDays));
            found.Sell = Parse(sell.Text);
            found.BuyCost = Parse(cost.Text);
            found.AirwayBillNo = airwayBillNo.Text;
            found.TariffNo = ExtractTariffNo(ComboText(tariff));
            found.ShipmentDirection = shipmentDirection.SelectedItem?.ToString() ?? "Export";
            found.ShipmentService = ComboText(shipmentService);
            found.ShipmentServiceOther = shipmentServiceOther.Text.Trim();
            AddHistory("Updated shipment from right panel", found.JobNo);
            NavigationList.SelectedItem = "Shipments / Jobs";
        }));
        form.Children.Add(new Border { Height = 1, Background = Brush("#DDE4EC"), Margin = new Thickness(0, 14, 0, 14) });
        form.Children.Add(new TextBlock { Text = "Mandatory before job number: customer must not be overdue, Invoice must be attached, and PL must be attached.", TextWrapping = TextWrapping.Wrap, Foreground = Brush("#8E3B46"), Margin = new Thickness(0, 0, 0, 12) });
        form.Children.Add(Labelled("Branch", branch));
        form.Children.Add(Labelled("Job Number", jobNumber));
        form.Children.Add(Labelled("Airway Bill Number", airwayBillNo));
        form.Children.Add(Labelled("Shipment Type", shipmentDirection));
        form.Children.Add(Labelled("Shipment Service", shipmentService));
        form.Children.Add(Labelled("Other Service / Manual Entry", shipmentServiceOther));
        form.Children.Add(Labelled("Customer", customer));
        form.Children.Add(Labelled("Applied Tariff", tariff));
        form.Children.Add(Labelled("Origin", origin));
        form.Children.Add(Labelled("Destination", destination));
        form.Children.Add(Labelled("Pieces / Pallets", pieces));
        form.Children.Add(Labelled("Number of Pallets", pallets));
        form.Children.Add(Labelled("Actual Weight KG", actual));
        form.Children.Add(Labelled("Volume CBM", cbm));
        form.Children.Add(Labelled("Chargeable Weight KG", chargeable));
        form.Children.Add(Labelled("Transit Time in Days", transitDays));
        form.Children.Add(Labelled("Sell Price", sell));
        form.Children.Add(Labelled("Supplier Cost", cost));
        form.Children.Add(invoiceAttached);
        form.Children.Add(packingListAttached);
        form.Children.Add(ActionButton("Create Shipment", () =>
        {
            var customerName = ComboText(customer);
            var matchedCustomer = _customers.FirstOrDefault(c => c.Name.Equals(customerName, StringComparison.OrdinalIgnoreCase));
            if (matchedCustomer?.IsAccountOverdue == true)
            {
                AddHistory("Blocked job number - overdue account", customerName);
                MessageBox.Show("Cannot create job number. Customer account is overdue.", "Job blocked", MessageBoxButton.OK, MessageBoxImage.Warning);
                return;
            }

            if (invoiceAttached.IsChecked != true || packingListAttached.IsChecked != true)
            {
                AddHistory("Blocked job number - mandatory documents missing", customerName);
                MessageBox.Show("Cannot create job number. Mandatory basic documents are required: Invoice and PL.", "Job blocked", MessageBoxButton.OK, MessageBoxImage.Warning);
                return;
            }

            var jobNo = string.IsNullOrWhiteSpace(jobNumber.Text) ? NextAvailableNumber("AFS") : jobNumber.Text;
            if (_shipments.Any(s => s.JobNo.Equals(jobNo, StringComparison.OrdinalIgnoreCase)))
            {
                MessageBox.Show("Job number already used or duplicate entry. Reset the form to generate a new job number.", "Duplicate number", MessageBoxButton.OK, MessageBoxImage.Warning);
                return;
            }

            var awbNo = string.IsNullOrWhiteSpace(airwayBillNo.Text) ? NextAvailableNumber("AWB") : airwayBillNo.Text;
            if (DuplicateAirwayBillExists(awbNo))
            {
                MessageBox.Show("Airway bill number already used. Duplicate airway bill numbers are not allowed.", "Duplicate airway bill", MessageBoxButton.OK, MessageBoxImage.Warning);
                return;
            }

            _shipments.Add(new Shipment(jobNo, branch.SelectedItem?.ToString() ?? "Branch 1", customerName, ComboText(origin), ComboText(destination), "Booked", ToInt(pieces.Text), Parse(actual.Text), ToDouble(cbm.Text), Parse(chargeable.Text), Parse(sell.Text), Parse(cost.Text), "Pending", "Unbilled", ToInt(ComboText(transitDays)), "", awbNo, ExtractTariffNo(ComboText(tariff)), _currentUser.UserName, shipmentDirection.SelectedItem?.ToString() ?? "Export", ComboText(shipmentService), shipmentServiceOther.Text.Trim()));
            _documents.Add(new DocumentItem(NextAvailableNumber("DOC"), jobNo, "Invoice", "Attached", DateTime.Today.ToString("yyyy-MM-dd"), "operations"));
            _documents.Add(new DocumentItem(NextAvailableNumber("DOC"), jobNo, "PL", "Attached", DateTime.Today.ToString("yyyy-MM-dd"), "operations"));
            AddHistory("Created shipment", jobNo);
            MessageBox.Show($"Shipment {jobNo} created.", "Apollo Freight ERP");
            NavigationList.SelectedItem = "Shipments / Jobs";
        }));
        form.Children.Add(ActionButton("Reset New Shipment", () =>
        {
            searchBox.Text = "";
            jobNumber.Text = NextAvailableNumber("AFS");
            airwayBillNo.Text = NextAvailableNumber("AWB");
            tariff.Text = "";
            shipmentDirection.SelectedIndex = 1;
            shipmentService.SelectedIndex = 0;
            shipmentServiceOther.Text = "";
            customer.Text = "";
            origin.SelectedIndex = 0;
            destination.SelectedIndex = 0;
            pieces.Text = "1";
            pallets.Text = "1";
            actual.Text = "100";
            cbm.Text = "1.0";
            chargeable.Text = "200";
            transitDays.SelectedIndex = 2;
            sell.Text = "100.000";
            cost.Text = "70.000";
            invoiceAttached.IsChecked = false;
            packingListAttached.IsChecked = false;
            shipmentGrid.ItemsSource = filteredShipments;
        }));
        form.Children.Add(Labelled("Block Reason", blockReason));
        form.Children.Add(ActionButton("Block Cargo Process", () =>
        {
            var shipment = VisibleShipments().FirstOrDefault(s => s.JobNo.Equals(ComboText(searchBox), StringComparison.OrdinalIgnoreCase));
            if (shipment is null)
            {
                MessageBox.Show("Search/load a shipment first, then click Block Cargo Process.", "Apollo Freight ERP", MessageBoxButton.OK, MessageBoxImage.Warning);
                return;
            }

            shipment.Status = "Blocked";
            AddHistory("Blocked cargo process", $"{shipment.JobNo} - {blockReason.Text.Trim()}");
            MessageBox.Show($"{shipment.JobNo} is now blocked. Reason recorded in Audit Log.", "Apollo Freight ERP");
            NavigationList.SelectedItem = "Shipments / Jobs";
        }));
        form.Children.Add(new TextBlock { Text = "Charge Calculator", FontWeight = FontWeights.SemiBold, Margin = new Thickness(0, 16, 0, 8), FontSize = 16 });
        form.Children.Add(BuildCalculator());
        root.Children.Add(Panel("Shipment Actions", PopupLaunchPanel("New / Edit Shipment", "New Shipment", form, "Use New Shipment to open the entry popup. Existing shipments can also be opened by double-clicking the register row.")));
        Grid.SetColumn(root.Children[^1], 1);
        return root;
    }

    private UIElement BuildConsolidation()
    {
        var root = TwoColumnLayout();
        var searchCon = new ComboBox { ItemsSource = _loads.Select(l => l.LoadNo).ToList(), IsEditable = true, Padding = new Thickness(8), BorderBrush = Brush("#C7D2DE"), MinWidth = 180 };
        var consolidationNo = new TextBox { Text = NextAvailableNumber("CON"), IsReadOnly = true, Padding = new Thickness(8), BorderBrush = Brush("#C7D2DE"), Background = Brush("#F7FAFC") };
        var route = new TextBox { Text = "Kuwait - Riyadh", Padding = new Thickness(8), BorderBrush = Brush("#C7D2DE") };
        var jobList = new ComboBox { ItemsSource = RemainingJobNumbers().ToList(), IsEditable = true, Padding = new Thickness(8), BorderBrush = Brush("#C7D2DE") };
        var jobPreview = new ContentControl();
        var customerList = new ComboBox { ItemsSource = VisibleParties(_customers).Select(c => c.Name).ToList(), IsEditable = true, Padding = new Thickness(8), BorderBrush = Brush("#C7D2DE") };
        var pallets = new TextBox { Text = "1", Padding = new Thickness(8), BorderBrush = Brush("#C7D2DE") };
        var transporter = new TextBox { Text = "Al Dana Transport", Padding = new Thickness(8), BorderBrush = Brush("#C7D2DE") };
        var vehicle = new TextBox { Text = "KWT-00000", Padding = new Thickness(8), BorderBrush = Brush("#C7D2DE") };
        var tripDate = new DatePicker { SelectedDate = DateTime.Today, Height = 36, BorderBrush = Brush("#C7D2DE") };
        var status = new ComboBox { ItemsSource = new[] { "Planned", "Loading", "Dispatched", "Delivered", "Closed" }, SelectedIndex = 0, Padding = new Thickness(8), BorderBrush = Brush("#C7D2DE") };

        void LoadIntoForm(ConsolidationLoad found)
        {
            searchCon.Text = found.LoadNo;
            route.Text = found.Route;
            transporter.Text = found.Transporter;
            vehicle.Text = found.VehicleNo;
            status.SelectedItem = found.Status;
            consolidationNo.Text = found.LoadNo;
            tripDate.SelectedDate = ParseDate(found.TripDate) ?? DateTime.Today;
            jobList.ItemsSource = RemainingJobNumbers(found.LoadNo).ToList();
            jobPreview.Content = BuildConsolidationTree(found);
        }

        var filteredLoads = ApplyDateRangeFilter(_loads).ToList();
        var loadGrid = DataGridFor(filteredLoads, 265, false);
        var selectedLoadDetails = new ContentControl
        {
            Content = new TextBlock
            {
                Text = "Select a consolidation number above to show linked job numbers below.",
                Foreground = Brush("#687582"),
                TextWrapping = TextWrapping.Wrap
            }
        };

        void ShowLoads(IEnumerable<ConsolidationLoad> loadsToShow, ConsolidationLoad? selected = null)
        {
            var rows = loadsToShow.ToList();
            loadGrid.ItemsSource = rows;
            if (selected is not null)
            {
                loadGrid.SelectedItem = selected;
                selectedLoadDetails.Content = BuildConsolidationTree(selected);
            }
            else
            {
                selectedLoadDetails.Content = rows.Count == 1
                    ? BuildConsolidationTree(rows[0])
                    : new TextBlock
                    {
                        Text = "Select a consolidation number above to show linked job numbers below.",
                        Foreground = Brush("#687582"),
                        TextWrapping = TextWrapping.Wrap
                    };
            }
        }

        loadGrid.SelectionChanged += (_, _) =>
        {
            if (loadGrid.SelectedItem is ConsolidationLoad selected)
            {
                selectedLoadDetails.Content = BuildConsolidationTree(selected);
            }
        };

        searchCon.SelectionChanged += (_, _) =>
        {
            if (searchCon.SelectedItem is not null)
            {
                var found = _loads.FirstOrDefault(l => l.LoadNo.Equals(searchCon.SelectedItem.ToString(), StringComparison.OrdinalIgnoreCase));
                if (found is not null)
                {
                    LoadIntoForm(found);
                    ShowLoads(new[] { found }, found);
                }
            }
        };

        var loadPanel = new StackPanel();
        loadPanel.Children.Add(new TextBlock
        {
            Text = "Consolidation number index. Select a load to show linked job numbers below; double-click a job in the tree to open full shipment details.",
            Foreground = Brush("#687582"),
            Margin = new Thickness(0, 0, 0, 8),
            TextWrapping = TextWrapping.Wrap
        });
        loadPanel.Children.Add(loadGrid);
        loadPanel.Children.Add(new Border { Height = 1, Background = Brush("#DDE4EC"), Margin = new Thickness(0, 14, 0, 14) });
        loadPanel.Children.Add(new TextBlock { Text = "Linked Jobs Tree", FontSize = 16, FontWeight = FontWeights.SemiBold, Foreground = Brush("#16202A"), Margin = new Thickness(0, 0, 0, 8) });
        loadPanel.Children.Add(new ScrollViewer
        {
            MaxHeight = 260,
            VerticalScrollBarVisibility = ScrollBarVisibility.Auto,
            Content = selectedLoadDetails
        });
        var loadButtons = new StackPanel { Orientation = Orientation.Horizontal, Margin = new Thickness(0, 12, 0, 0) };
        loadButtons.Children.Add(ActionButton("Show All Loads", () => ShowLoads(ApplyDateRangeFilter(_loads))));
        loadButtons.Children.Add(ActionButton("Save Changes / Add History", () =>
        {
            if (!ValidateAllUniqueNumbers(out var message))
            {
                MessageBox.Show(message, "Duplicate entry", MessageBoxButton.OK, MessageBoxImage.Warning);
                return;
            }

            AddHistory("Edited consolidation", "Consolidation");
        }));
        loadPanel.Children.Add(loadButtons);
        root.Children.Add(Panel("Loads / Trips", loadPanel));
        Grid.SetColumn(root.Children[^1], 0);

        var summary = new StackPanel();
        summary.Children.Add(new TextBlock { Text = "Search previous consolidation here, then update from this same panel.", TextWrapping = TextWrapping.Wrap, Foreground = Brush("#687582"), Margin = new Thickness(0, 0, 0, 8) });
        summary.Children.Add(Labelled("Search Consolidation No", searchCon));
        summary.Children.Add(ActionButton("Load Consolidation", () =>
        {
            var found = _loads.FirstOrDefault(l => l.LoadNo.Equals(ComboText(searchCon), StringComparison.OrdinalIgnoreCase));
            if (found is null)
            {
                MessageBox.Show("Consolidation not found.", "Apollo Freight ERP", MessageBoxButton.OK, MessageBoxImage.Warning);
                return;
            }

            LoadIntoForm(found);
            ShowLoads(new[] { found }, found);
        }));
        summary.Children.Add(ActionButton("Update Consolidation", () =>
        {
            var found = _loads.FirstOrDefault(l => l.LoadNo.Equals(ComboText(searchCon), StringComparison.OrdinalIgnoreCase));
            if (found is null)
            {
                MessageBox.Show("Load a consolidation first.", "Apollo Freight ERP", MessageBoxButton.OK, MessageBoxImage.Warning);
                return;
            }

            if (UserNeedsManifestApproval(found))
            {
                SubmitManifestApprovalRequest(
                    found,
                    route.Text,
                    transporter.Text,
                    vehicle.Text,
                    status.SelectedItem?.ToString() ?? found.Status,
                    tripDate.SelectedDate?.ToString("yyyy-MM-dd") ?? found.TripDate,
                    found.JobNumbers,
                    "Manifest edit pending approval");
                MessageBox.Show("Manifest change saved as draft and sent to admin for approval.", "Pending approval", MessageBoxButton.OK, MessageBoxImage.Information);
                RefreshCurrentModule();
                return;
            }

            ApplyConsolidationValues(found, route.Text, transporter.Text, vehicle.Text, status.SelectedItem?.ToString() ?? found.Status, tripDate.SelectedDate?.ToString("yyyy-MM-dd") ?? found.TripDate, found.JobNumbers);
            AddHistory("Updated consolidation from right panel", found.LoadNo);
            ShowLoads(new[] { found }, found);
        }));
        summary.Children.Add(new Border { Height = 1, Background = Brush("#DDE4EC"), Margin = new Thickness(0, 14, 0, 14) });
        summary.Children.Add(Labelled("Consolidation No", consolidationNo));
        summary.Children.Add(Labelled("Job List", jobList));
        summary.Children.Add(ActionButton("Get Job Data", () =>
        {
            var shipment = _shipments.FirstOrDefault(s => s.JobNo.Equals(ComboText(jobList), StringComparison.OrdinalIgnoreCase));
            if (shipment is null)
            {
                jobPreview.Content = new TextBlock { Text = "Job number not found.", Foreground = Brush("#8E3B46") };
                return;
            }

            customerList.Text = shipment.Customer;
            pallets.Text = shipment.Pieces.ToString(CultureInfo.InvariantCulture);
            jobPreview.Content = BuildShipmentPreview(shipment);
        }));
        summary.Children.Add(jobPreview);
        summary.Children.Add(Labelled("Customer Name", customerList));
        summary.Children.Add(Labelled("Number of Pallets", pallets));
        summary.Children.Add(Labelled("Route", route));
        summary.Children.Add(Labelled("Trip Date", tripDate));
        summary.Children.Add(Labelled("Transporter", transporter));
        summary.Children.Add(Labelled("Vehicle No", vehicle));
        summary.Children.Add(Labelled("Status", status));
        summary.Children.Add(ActionButton("Add Job to Consolidation", () =>
        {
            var shipment = _shipments.FirstOrDefault(s => s.JobNo.Equals(ComboText(jobList), StringComparison.OrdinalIgnoreCase));
            if (shipment is null)
            {
                MessageBox.Show("Select a valid job number first.", "Apollo Freight ERP", MessageBoxButton.OK, MessageBoxImage.Warning);
                return;
            }

            var load = _loads.FirstOrDefault(l => l.LoadNo.Equals(consolidationNo.Text, StringComparison.OrdinalIgnoreCase));
            if (_loads.Any(existing => !ReferenceEquals(existing, load) && LoadJobs(existing).Any(job => job.Equals(shipment.JobNo, StringComparison.OrdinalIgnoreCase))))
            {
                MessageBox.Show("This job number is already added in another consolidation. The dropdown shows only remaining jobs.", "Duplicate job in consolidation", MessageBoxButton.OK, MessageBoxImage.Warning);
                return;
            }

            if (load is null)
            {
                load = new ConsolidationLoad(consolidationNo.Text, route.Text, transporter.Text, vehicle.Text, status.SelectedItem?.ToString() ?? "Planned", 0, 0, 0, 0, string.Empty, tripDate.SelectedDate?.ToString("yyyy-MM-dd") ?? DateTime.Today.ToString("yyyy-MM-dd"));
                _loads.Add(load);
            }

            var proposedJobs = JobNumbersWith(load, shipment.JobNo);
            if (UserNeedsManifestApproval(load))
            {
                SubmitManifestApprovalRequest(
                    load,
                    route.Text,
                    transporter.Text,
                    vehicle.Text,
                    status.SelectedItem?.ToString() ?? load.Status,
                    tripDate.SelectedDate?.ToString("yyyy-MM-dd") ?? load.TripDate,
                    proposedJobs,
                    "Add job to approved manifest");
                MessageBox.Show("Job add saved as draft and sent to admin for approval.", "Pending approval", MessageBoxButton.OK, MessageBoxImage.Information);
                RefreshCurrentModule();
                return;
            }

            ApplyConsolidationValues(load, route.Text, transporter.Text, vehicle.Text, status.SelectedItem?.ToString() ?? load.Status, tripDate.SelectedDate?.ToString("yyyy-MM-dd") ?? load.TripDate, proposedJobs);
            customerList.Text = shipment.Customer;
            pallets.Text = load.Pieces.ToString(CultureInfo.InvariantCulture);
            jobPreview.Content = BuildConsolidationTree(load);
            AddHistory("Added job to consolidation", $"{load.LoadNo} - {shipment.JobNo}");
            jobList.ItemsSource = RemainingJobNumbers(load.LoadNo).ToList();
            ShowLoads(new[] { load }, load);
        }));
        summary.Children.Add(ActionButton("Remove Job from Consolidation", () =>
        {
            var load = _loads.FirstOrDefault(l => l.LoadNo.Equals(consolidationNo.Text, StringComparison.OrdinalIgnoreCase));
            if (load is null)
            {
                MessageBox.Show("Consolidation not found.", "Apollo Freight ERP", MessageBoxButton.OK, MessageBoxImage.Warning);
                return;
            }

            var proposedJobs = JobNumbersWithout(load, ComboText(jobList));
            if (UserNeedsManifestApproval(load))
            {
                SubmitManifestApprovalRequest(
                    load,
                    route.Text,
                    transporter.Text,
                    vehicle.Text,
                    status.SelectedItem?.ToString() ?? load.Status,
                    tripDate.SelectedDate?.ToString("yyyy-MM-dd") ?? load.TripDate,
                    proposedJobs,
                    "Remove job from approved manifest");
                MessageBox.Show("Job removal saved as draft and sent to admin for approval.", "Pending approval", MessageBoxButton.OK, MessageBoxImage.Information);
                RefreshCurrentModule();
                return;
            }

            ApplyConsolidationValues(load, route.Text, transporter.Text, vehicle.Text, status.SelectedItem?.ToString() ?? load.Status, tripDate.SelectedDate?.ToString("yyyy-MM-dd") ?? load.TripDate, proposedJobs);
            jobPreview.Content = BuildConsolidationTree(load);
            AddHistory("Removed job from consolidation", $"{load.LoadNo} - {ComboText(jobList)}");
            jobList.ItemsSource = RemainingJobNumbers(load.LoadNo).ToList();
            ShowLoads(new[] { load }, load);
        }));
        summary.Children.Add(ActionButton("Create Consolidation", () =>
        {
            if (string.IsNullOrWhiteSpace(consolidationNo.Text))
            {
                MessageBox.Show("Consolidation number is required.", "Apollo Freight ERP", MessageBoxButton.OK, MessageBoxImage.Warning);
                return;
            }

            if (_loads.Any(l => l.LoadNo.Equals(consolidationNo.Text, StringComparison.OrdinalIgnoreCase)))
            {
                MessageBox.Show("Consolidation number already used or duplicate entry. Use Add Job to Consolidation or reset/open page for a new number.", "Duplicate number", MessageBoxButton.OK, MessageBoxImage.Warning);
                return;
            }

            var load = new ConsolidationLoad(consolidationNo.Text, route.Text, transporter.Text, vehicle.Text, status.SelectedItem?.ToString() ?? "Planned", 0, 0, 0, 0, string.Empty, tripDate.SelectedDate?.ToString("yyyy-MM-dd") ?? DateTime.Today.ToString("yyyy-MM-dd"));
            _loads.Add(load);
            if (!string.IsNullOrWhiteSpace(ComboText(jobList)))
            {
                AddJobToLoad(load, ComboText(jobList));
            }
            jobPreview.Content = BuildConsolidationTree(load);
            AddHistory("Created consolidation", consolidationNo.Text);
            MessageBox.Show($"Consolidation {consolidationNo.Text} created.", "Apollo Freight ERP");
            jobList.ItemsSource = RemainingJobNumbers(load.LoadNo).ToList();
            ShowLoads(new[] { load }, load);
        }));
        summary.Children.Add(ActionButton("Generate Loading List / Manifest", () =>
        {
            var load = _loads.FirstOrDefault(l => l.LoadNo.Equals(consolidationNo.Text, StringComparison.OrdinalIgnoreCase));
            if (load is null)
            {
                MessageBox.Show("Create or load a consolidation first.", "Apollo Freight ERP", MessageBoxButton.OK, MessageBoxImage.Warning);
                return;
            }

            if (IsAdmin())
            {
                ApplyConsolidationValues(load, route.Text, transporter.Text, vehicle.Text, status.SelectedItem?.ToString() ?? load.Status, tripDate.SelectedDate?.ToString("yyyy-MM-dd") ?? load.TripDate, load.JobNumbers);
                load.ManifestStatus = "Approved";
                AddHistory("Generated and approved manifest", load.LoadNo);
                MessageBox.Show("Manifest approved and ready for loading list/export.", "Apollo Freight ERP", MessageBoxButton.OK, MessageBoxImage.Information);
                ShowLoads(new[] { load }, load);
                return;
            }

            SubmitManifestApprovalRequest(
                load,
                route.Text,
                transporter.Text,
                vehicle.Text,
                status.SelectedItem?.ToString() ?? load.Status,
                tripDate.SelectedDate?.ToString("yyyy-MM-dd") ?? load.TripDate,
                load.JobNumbers,
                "Generate loading list / manifest");
            MessageBox.Show("Manifest generated as draft and sent to admin for approval.", "Pending approval", MessageBoxButton.OK, MessageBoxImage.Information);
            RefreshCurrentModule();
        }));
        root.Children.Add(Panel("Consolidation Actions", PopupLaunchPanel("New / Edit Consolidation", "New Consolidation", summary, "Create or update consolidation details from the popup. The job dropdown shows only remaining unassigned jobs.")));
        Grid.SetColumn(root.Children[^1], 1);
        return root;
    }

    private UIElement BuildPartyMaster(ObservableCollection<Party> parties, string label)
    {
        var root = TwoColumnLayout();
        var partyPanel = new StackPanel();
        var visibleParties = VisibleParties(parties).ToList();
        var filteredParties = ApplyDateRangeFilter(visibleParties).ToList();
        var partySearch = new ComboBox { ItemsSource = visibleParties.SelectMany(p => new[] { p.Code, p.Name }).Distinct().ToList(), IsEditable = true, Padding = new Thickness(8), BorderBrush = Brush("#C7D2DE"), MinWidth = 220 };
        var partyGrid = DataGridFor(filteredParties, label.StartsWith("Customer") ? 250 : 400, false);
        partyPanel.Children.Add(partyGrid);
        DataGrid? depositGrid = null;
        if (label.StartsWith("Customer"))
        {
            depositGrid = DataGridFor(ApplyDateRangeFilter(VisibleCustomerDeposits()).ToList(), 190, false);
            partyPanel.Children.Add(new TextBlock { Text = "Customer Deposits / Balances", FontSize = 16, FontWeight = FontWeights.SemiBold, Foreground = Brush("#16202A"), Margin = new Thickness(0, 16, 0, 8) });
            partyPanel.Children.Add(depositGrid);
        }

        partyPanel.Children.Add(ActionButton("Save Changes / Add History", () =>
        {
            if (!ValidateAllUniqueNumbers(out var message))
            {
                MessageBox.Show(message, "Duplicate entry", MessageBoxButton.OK, MessageBoxImage.Warning);
                return;
            }

            AddHistory($"Edited {label}", label);
        }));
        root.Children.Add(Panel($"{label} Register", partyPanel));
        Grid.SetColumn(root.Children[^1], 0);

        var code = new TextBox { Text = label.StartsWith("Customer") ? NextAvailableNumber("CUS") : NextAvailableNumber("TRN"), Padding = new Thickness(8), BorderBrush = Brush("#C7D2DE") };
        var name = new TextBox { Padding = new Thickness(8), BorderBrush = Brush("#C7D2DE") };
        var location = new TextBox { Padding = new Thickness(8), BorderBrush = Brush("#C7D2DE") };
        var email = new TextBox { Padding = new Thickness(8), BorderBrush = Brush("#C7D2DE") };
        var terms = new ComboBox { ItemsSource = new[] { "15 days", "30 days" }, SelectedIndex = 1, Padding = new Thickness(8), BorderBrush = Brush("#C7D2DE") };
        var active = new ComboBox { ItemsSource = new[] { "Active", "Inactive" }, SelectedIndex = 0, Padding = new Thickness(8), BorderBrush = Brush("#C7D2DE") };
        var partyBranchOptions = _currentUser.BranchAccess == "Both" ? new[] { "Branch 1", "Branch 2", "Both" } : new[] { _currentUser.BranchAccess };
        var branch = new ComboBox { ItemsSource = partyBranchOptions, SelectedIndex = 0, IsEnabled = _currentUser.BranchAccess == "Both", Padding = new Thickness(8), BorderBrush = Brush("#C7D2DE") };
        var overdue = new CheckBox { Content = "Account overdue / block job number", Margin = new Thickness(0, 0, 0, 12), IsEnabled = label.StartsWith("Customer") };
        var blockTarget = new ComboBox { ItemsSource = VisibleParties(parties).Select(p => p.Name).ToList(), IsEditable = true, Padding = new Thickness(8), BorderBrush = Brush("#C7D2DE") };
        var blockReason = new TextBox { Text = "Credit hold / documents issue", Padding = new Thickness(8), BorderBrush = Brush("#C7D2DE") };
        var depositSearch = new ComboBox { ItemsSource = VisibleCustomerDeposits().SelectMany(d => new[] { d.DepositNo, d.CustomerName }).Distinct().ToList(), IsEditable = true, Padding = new Thickness(8), BorderBrush = Brush("#C7D2DE") };
        var depositNo = new TextBox { Text = NextAvailableNumber("DEP"), Padding = new Thickness(8), BorderBrush = Brush("#C7D2DE") };
        var depositCustomer = new ComboBox { ItemsSource = VisibleParties(_customers).Select(c => c.Name).ToList(), IsEditable = true, Padding = new Thickness(8), BorderBrush = Brush("#C7D2DE") };
        var depositDate = new DatePicker { SelectedDate = DateTime.Today, Height = 36, BorderBrush = Brush("#C7D2DE") };
        var originalAmount = new TextBox { Text = "0.000", Padding = new Thickness(8), BorderBrush = Brush("#C7D2DE") };
        var paidAmount = new TextBox { Text = "0.000", Padding = new Thickness(8), BorderBrush = Brush("#C7D2DE") };
        var purpose = new ComboBox { ItemsSource = new[] { "Freight deposit", "Credit security", "Advance payment", "Other" }, SelectedIndex = 0, IsEditable = true, Padding = new Thickness(8), BorderBrush = Brush("#C7D2DE") };
        var balance = new TextBox { Text = "0.000", Padding = new Thickness(8), BorderBrush = Brush("#C7D2DE") };
        var form = new StackPanel();
        form.Children.Add(new TextBlock { Text = $"Search previous {label.ToLowerInvariant()} here, then update from this same panel.", TextWrapping = TextWrapping.Wrap, Foreground = Brush("#687582"), Margin = new Thickness(0, 0, 0, 8) });
        form.Children.Add(Labelled($"Search {label} No / Name", partySearch));
        form.Children.Add(ActionButton($"Load {label}", () =>
        {
            var key = ComboText(partySearch);
            var found = VisibleParties(parties).FirstOrDefault(p =>
                p.Code.Equals(key, StringComparison.OrdinalIgnoreCase) ||
                p.Name.Equals(key, StringComparison.OrdinalIgnoreCase));
            if (found is null)
            {
                MessageBox.Show($"{label} not found.", "Apollo Freight ERP", MessageBoxButton.OK, MessageBoxImage.Warning);
                return;
            }

            code.Text = found.Code;
            name.Text = found.Name;
            location.Text = found.LocationOrLane;
            email.Text = found.Email;
            terms.SelectedItem = found.Terms;
            active.SelectedItem = found.Status;
            branch.SelectedItem = found.Branch;
            overdue.IsChecked = found.IsAccountOverdue;
            partyGrid.ItemsSource = new[] { found };
            if (depositGrid is not null)
            {
                depositCustomer.Text = found.Name;
                depositGrid.ItemsSource = VisibleCustomerDeposits()
                    .Where(d => d.CustomerName.Equals(found.Name, StringComparison.OrdinalIgnoreCase))
                    .ToList();
            }
        }));
        form.Children.Add(ActionButton($"Update {label}", () =>
        {
            var found = parties.FirstOrDefault(p => p.Code.Equals(code.Text, StringComparison.OrdinalIgnoreCase));
            if (found is null)
            {
                MessageBox.Show($"Load a {label.ToLowerInvariant()} first.", "Apollo Freight ERP", MessageBoxButton.OK, MessageBoxImage.Warning);
                return;
            }

            if (parties.Any(p => !ReferenceEquals(p, found) && p.Name.Equals(name.Text.Trim(), StringComparison.OrdinalIgnoreCase)))
            {
                MessageBox.Show($"{label} name already used or duplicate entry.", "Duplicate entry", MessageBoxButton.OK, MessageBoxImage.Warning);
                return;
            }

            found.Name = name.Text;
            found.LocationOrLane = location.Text;
            found.Email = email.Text;
            found.Terms = terms.SelectedItem?.ToString() ?? found.Terms;
            found.Status = active.SelectedItem?.ToString() ?? found.Status;
            found.Branch = branch.SelectedItem?.ToString() ?? found.Branch;
            found.IsAccountOverdue = overdue.IsChecked == true;
            AddHistory($"Updated {label} from right panel", found.Code);
            NavigationList.SelectedItem = label.StartsWith("Customer") ? "Customers" : "Suppliers / Transporters";
        }));
        form.Children.Add(new Border { Height = 1, Background = Brush("#DDE4EC"), Margin = new Thickness(0, 14, 0, 14) });
        form.Children.Add(Labelled($"{label} Code", code));
        form.Children.Add(Labelled("Name", name));
        form.Children.Add(Labelled("Lane / Location", location));
        form.Children.Add(Labelled("Contact Email", email));
        form.Children.Add(Labelled("Credit Limit Days", terms));
        form.Children.Add(Labelled("Status", active));
        form.Children.Add(Labelled("Branch", branch));
        form.Children.Add(overdue);
        form.Children.Add(ActionButton($"Create {label}", () =>
        {
            if (string.IsNullOrWhiteSpace(name.Text))
            {
                MessageBox.Show("Name is required.", "Apollo Freight ERP");
                return;
            }

            if (parties.Any(p => p.Code.Equals(code.Text.Trim(), StringComparison.OrdinalIgnoreCase)))
            {
                MessageBox.Show($"{label} code already used. Duplicate numbers are not allowed.", "Duplicate code", MessageBoxButton.OK, MessageBoxImage.Warning);
                return;
            }

            if (parties.Any(p => p.Name.Equals(name.Text.Trim(), StringComparison.OrdinalIgnoreCase)))
            {
                MessageBox.Show($"{label} name already exists. Duplicate data is not allowed.", "Duplicate data", MessageBoxButton.OK, MessageBoxImage.Warning);
                return;
            }

            parties.Add(new Party(code.Text, name.Text, location.Text, email.Text, terms.SelectedItem?.ToString() ?? "30 days", active.SelectedItem?.ToString() ?? "Active", overdue.IsChecked == true, branch.SelectedItem?.ToString() ?? "Branch 1"));
            AddHistory($"Created {label}", code.Text);
            MessageBox.Show($"{label} created.", "Apollo Freight ERP");
        }));
        if (label.StartsWith("Customer"))
        {
            form.Children.Add(new Border { Height = 1, Background = Brush("#DDE4EC"), Margin = new Thickness(0, 14, 0, 14) });
            form.Children.Add(new TextBlock { Text = "Block / Unblock Customer", FontWeight = FontWeights.SemiBold, FontSize = 16, Margin = new Thickness(0, 0, 0, 8) });
            form.Children.Add(Labelled("Customer", blockTarget));
            form.Children.Add(Labelled("Reason", blockReason));
            form.Children.Add(ActionButton("Block Customer", () =>
            {
                var selected = _customers.FirstOrDefault(c => c.Name.Equals(ComboText(blockTarget), StringComparison.OrdinalIgnoreCase));
                if (selected is null)
                {
                    MessageBox.Show("Customer not found.", "Apollo Freight ERP", MessageBoxButton.OK, MessageBoxImage.Warning);
                    return;
                }

                selected.IsAccountOverdue = true;
                selected.Status = "Blocked";
                AddHistory("Blocked customer", $"{selected.Name} - {blockReason.Text}");
                MessageBox.Show("Customer blocked. New job numbers will be stopped.", "Apollo Freight ERP");
                NavigationList.SelectedItem = "Customers";
            }));
            form.Children.Add(ActionButton(_currentUser.Role == "Admin" ? "Unblock Customer" : "Request Unblock", () =>
            {
                var selected = _customers.FirstOrDefault(c => c.Name.Equals(ComboText(blockTarget), StringComparison.OrdinalIgnoreCase));
                if (selected is null)
                {
                    MessageBox.Show("Customer not found.", "Apollo Freight ERP", MessageBoxButton.OK, MessageBoxImage.Warning);
                    return;
                }

                if (_currentUser.Role == "Admin")
                {
                    selected.IsAccountOverdue = false;
                    selected.Status = "Active";
                    AddHistory("Unblocked customer", selected.Name);
                    MessageBox.Show("Customer unblocked.", "Apollo Freight ERP");
                }
                else
                {
                    var requestNo = NextAvailableNumber("REQ");
                    if (_unblockRequests.Any(request => request.RequestNo.Equals(requestNo, StringComparison.OrdinalIgnoreCase)) ||
                        _adminRequests.Any(request => request.RequestNo.Equals(requestNo, StringComparison.OrdinalIgnoreCase)))
                    {
                        MessageBox.Show("Request number already used or duplicate entry.", "Duplicate request", MessageBoxButton.OK, MessageBoxImage.Warning);
                        return;
                    }

                    _unblockRequests.Add(new UnblockRequest(requestNo, selected.Name, _currentUser.UserName, blockReason.Text, "Pending", DateTime.Today.ToString("yyyy-MM-dd")));
                    AddHistory("Requested customer unblock", $"{selected.Name} - {requestNo}");
                    MessageBox.Show("Unblock request sent to admin.", "Apollo Freight ERP");
                }
                NavigationList.SelectedItem = "Customers";
            }));

            form.Children.Add(new Border { Height = 1, Background = Brush("#DDE4EC"), Margin = new Thickness(0, 14, 0, 14) });
            form.Children.Add(new TextBlock { Text = "Customer Deposit / Balance", FontWeight = FontWeights.SemiBold, FontSize = 16, Margin = new Thickness(0, 0, 0, 8) });
            form.Children.Add(Labelled("Search Deposit / Customer", depositSearch));
            form.Children.Add(ActionButton("Load Deposit", () =>
            {
                var key = ComboText(depositSearch);
                var found = VisibleCustomerDeposits().FirstOrDefault(d =>
                    d.DepositNo.Equals(key, StringComparison.OrdinalIgnoreCase) ||
                    d.CustomerName.Equals(key, StringComparison.OrdinalIgnoreCase));
                if (found is null)
                {
                    MessageBox.Show("Deposit not found.", "Apollo Freight ERP", MessageBoxButton.OK, MessageBoxImage.Warning);
                    return;
                }

                depositNo.Text = found.DepositNo;
                depositCustomer.Text = found.CustomerName;
                depositDate.SelectedDate = ParseDate(found.Date) ?? DateTime.Today;
                originalAmount.Text = found.OriginalAmount.ToString(CultureInfo.InvariantCulture);
                paidAmount.Text = found.PaidAmount.ToString(CultureInfo.InvariantCulture);
                purpose.Text = found.Purpose;
                balance.Text = found.Balance.ToString(CultureInfo.InvariantCulture);
                if (depositGrid is not null)
                {
                    depositGrid.ItemsSource = new[] { found };
                }
            }));
            form.Children.Add(Labelled("Deposit No", depositNo));
            form.Children.Add(Labelled("Customer Name", depositCustomer));
            form.Children.Add(Labelled("Deposit Date", depositDate));
            form.Children.Add(Labelled("Original Amount", originalAmount));
            form.Children.Add(Labelled("Paid Amount", paidAmount));
            form.Children.Add(Labelled("Purpose", purpose));
            form.Children.Add(Labelled("Manual Balance", balance));
            form.Children.Add(ActionButton("Calculate Balance", () =>
            {
                balance.Text = (Parse(originalAmount.Text) - Parse(paidAmount.Text)).ToString("N3", CultureInfo.InvariantCulture);
            }));
            form.Children.Add(ActionButton("Update Deposit", () =>
            {
                var found = _customerDeposits.FirstOrDefault(d => d.DepositNo.Equals(depositNo.Text.Trim(), StringComparison.OrdinalIgnoreCase));
                if (found is null)
                {
                    MessageBox.Show("Load a deposit first.", "Apollo Freight ERP", MessageBoxButton.OK, MessageBoxImage.Warning);
                    return;
                }

                found.CustomerName = ComboText(depositCustomer);
                found.Date = depositDate.SelectedDate?.ToString("yyyy-MM-dd") ?? found.Date;
                found.OriginalAmount = Parse(originalAmount.Text);
                found.PaidAmount = Parse(paidAmount.Text);
                found.Purpose = ComboText(purpose);
                found.Balance = Parse(balance.Text);
                found.Branch = CustomerBranch(found.CustomerName);
                AddHistory("Updated customer deposit", found.DepositNo);
                NavigationList.SelectedItem = "Customers";
            }));
            form.Children.Add(ActionButton("Create Deposit", () =>
            {
                var newDepositNo = string.IsNullOrWhiteSpace(depositNo.Text) ? NextAvailableNumber("DEP") : depositNo.Text.Trim();
                if (_customerDeposits.Any(d => d.DepositNo.Equals(newDepositNo, StringComparison.OrdinalIgnoreCase)))
                {
                    MessageBox.Show("Deposit number already used or duplicate entry.", "Duplicate number", MessageBoxButton.OK, MessageBoxImage.Warning);
                    return;
                }

                var customerName = ComboText(depositCustomer);
                if (string.IsNullOrWhiteSpace(customerName))
                {
                    MessageBox.Show("Customer name is required for deposit.", "Apollo Freight ERP", MessageBoxButton.OK, MessageBoxImage.Warning);
                    return;
                }

                var newDeposit = new CustomerDeposit(
                    newDepositNo,
                    customerName,
                    depositDate.SelectedDate?.ToString("yyyy-MM-dd") ?? DateTime.Today.ToString("yyyy-MM-dd"),
                    Parse(originalAmount.Text),
                    Parse(paidAmount.Text),
                    ComboText(purpose),
                    Parse(balance.Text),
                    CustomerBranch(customerName));
                _customerDeposits.Add(newDeposit);
                AddHistory("Created customer deposit", newDepositNo);
                MessageBox.Show("Customer deposit saved.", "Apollo Freight ERP");
                NavigationList.SelectedItem = "Customers";
            }));
        }
        root.Children.Add(Panel($"{label} Actions", PopupLaunchPanel($"New / Edit {label}", $"New {label}", form, $"Open the popup to create, search, or update {label.ToLowerInvariant()} details.")));
        Grid.SetColumn(root.Children[^1], 1);
        return root;
    }

    private UIElement BuildTariffs()
    {
        var root = TwoColumnLayout();
        var tariffPanel = new StackPanel();
        var allowedTariffs = VisibleTariffs().ToList();
        var filteredTariffs = ApplyDateRangeFilter(allowedTariffs).ToList();
        var tariffSearch = new ComboBox { ItemsSource = allowedTariffs.SelectMany(t => new[] { t.TariffNo, t.Customer, t.MainSection, t.WeightSection, t.RateType }).Distinct().ToList(), IsEditable = true, Padding = new Thickness(8), BorderBrush = Brush("#C7D2DE"), MinWidth = 220 };
        var tariffGrid = DataGridFor(filteredTariffs, 390, false);
        tariffPanel.Children.Add(tariffGrid);
        tariffPanel.Children.Add(ActionButton("Save Changes / Add History", () =>
        {
            if (!ValidateAllUniqueNumbers(out var message))
            {
                MessageBox.Show(message, "Duplicate entry", MessageBoxButton.OK, MessageBoxImage.Warning);
                return;
            }

            AddHistory("Edited tariff", "Rate Master");
        }));
        root.Children.Add(Panel("Rate Master", tariffPanel));
        Grid.SetColumn(root.Children[^1], 0);

        var customer = new ComboBox { ItemsSource = VisibleParties(_customers).Select(c => c.Name).ToList(), IsEditable = true, Padding = new Thickness(8), BorderBrush = Brush("#C7D2DE") };
        customer.SelectedIndex = customer.Items.Count > 0 ? 0 : -1;
        var mainSections = new[] { "FTL", "LTL" }.Concat(_tariffs.Select(t => t.MainSection)).Where(s => !string.IsNullOrWhiteSpace(s)).Distinct().ToList();
        var mainSection = new ComboBox { ItemsSource = mainSections, SelectedIndex = 0, IsEditable = true, Padding = new Thickness(8), BorderBrush = Brush("#C7D2DE") };
        var weightSection = new ComboBox { ItemsSource = new[] { "Minimum", "Up to 100 KG", "300 KG", "500 KG", "1000 KG", "More" }, SelectedIndex = 0, Padding = new Thickness(8), BorderBrush = Brush("#C7D2DE") };
        var origin = new ComboBox { ItemsSource = new[] { "Kuwait City", "Shuwaikh", "Ahmadi", "Riyadh", "Dammam", "Doha" }, SelectedIndex = 0, IsEditable = true, Padding = new Thickness(8), BorderBrush = Brush("#C7D2DE") };
        var destination = new ComboBox { ItemsSource = new[] { "Riyadh", "Dammam", "Doha", "Kuwait City", "Shuwaikh", "Ahmadi" }, SelectedIndex = 0, IsEditable = true, Padding = new Thickness(8), BorderBrush = Brush("#C7D2DE") };
        var rateType = new ComboBox { ItemsSource = new[] { "Per KG", "Per CBM", "Per Pallet", "Per Trip" }, SelectedIndex = 0, Padding = new Thickness(8), BorderBrush = Brush("#C7D2DE") };
        var rate = new TextBox { Text = "0.420", Padding = new Thickness(8), BorderBrush = Brush("#C7D2DE") };
        var min = new TextBox { Text = "35.000", Padding = new Thickness(8), BorderBrush = Brush("#C7D2DE") };
        var form = new StackPanel();
        form.Children.Add(new TextBlock { Text = "Search previous tariff here, then update from this same panel.", TextWrapping = TextWrapping.Wrap, Foreground = Brush("#687582"), Margin = new Thickness(0, 0, 0, 8) });
        form.Children.Add(Labelled("Search Tariff", tariffSearch));
        form.Children.Add(ActionButton("Load Tariff", () =>
        {
            var key = ComboText(tariffSearch);
            var found = VisibleTariffs().FirstOrDefault(t =>
                t.TariffNo.Equals(key, StringComparison.OrdinalIgnoreCase) ||
                t.Customer.Equals(key, StringComparison.OrdinalIgnoreCase));
            if (found is null)
            {
                MessageBox.Show("Tariff not found or no permission.", "Apollo Freight ERP", MessageBoxButton.OK, MessageBoxImage.Warning);
                return;
            }

            customer.Text = found.Customer;
            mainSection.Text = found.MainSection;
            weightSection.SelectedItem = found.WeightSection;
            origin.Text = found.Origin;
            destination.Text = found.Destination;
            rateType.SelectedItem = found.RateType;
            rate.Text = found.Rate.ToString(CultureInfo.InvariantCulture);
            min.Text = found.MinCharge.ToString(CultureInfo.InvariantCulture);
            tariffSearch.Text = found.TariffNo;
            tariffGrid.ItemsSource = new[] { found };
        }));
        form.Children.Add(ActionButton("Update Tariff", () =>
        {
            var found = VisibleTariffs().FirstOrDefault(t => t.TariffNo.Equals(ComboText(tariffSearch), StringComparison.OrdinalIgnoreCase));
            if (found is null)
            {
                MessageBox.Show("Load a tariff first.", "Apollo Freight ERP", MessageBoxButton.OK, MessageBoxImage.Warning);
                return;
            }

            found.Customer = ComboText(customer);
            found.MainSection = ComboText(mainSection);
            found.WeightSection = weightSection.SelectedItem?.ToString() ?? found.WeightSection;
            found.Origin = ComboText(origin);
            found.Destination = ComboText(destination);
            found.RateType = rateType.SelectedItem?.ToString() ?? found.RateType;
            found.Rate = Parse(rate.Text);
            found.MinCharge = Parse(min.Text);
            AddHistory("Updated tariff from right panel", found.TariffNo);
            NavigationList.SelectedItem = "Tariffs / Rate Master";
        }));
        form.Children.Add(new Border { Height = 1, Background = Brush("#DDE4EC"), Margin = new Thickness(0, 14, 0, 14) });
        var tariffRow1 = new UniformGrid { Columns = 3 };
        var tariffNoBox = new TextBox { Text = NextAvailableNumber("TAR"), Padding = new Thickness(8), BorderBrush = Brush("#C7D2DE") };
        tariffRow1.Children.Add(Labelled("Tariff Number", tariffNoBox));
        tariffRow1.Children.Add(Labelled("Customer", customer));
        tariffRow1.Children.Add(Labelled("Main Section", mainSection));
        var tariffRow2 = new UniformGrid { Columns = 3 };
        tariffRow2.Children.Add(Labelled("Weight Section", weightSection));
        tariffRow2.Children.Add(Labelled("Rate Type", rateType));
        tariffRow2.Children.Add(Labelled("Rate", rate));
        form.Children.Add(tariffRow1);
        form.Children.Add(tariffRow2);
        form.Children.Add(Labelled("Origin", origin));
        form.Children.Add(Labelled("Destination", destination));
        form.Children.Add(Labelled("Minimum Charge", min));
        form.Children.Add(Field("Volumetric Divisor", "5000"));
        form.Children.Add(Field("Effective From", "2026-01-01"));
        form.Children.Add(Field("Effective To", "2026-12-31"));
        form.Children.Add(ActionButton("Create Tariff", () =>
        {
            var tariffNo = string.IsNullOrWhiteSpace(tariffNoBox.Text) ? NextAvailableNumber("TAR") : tariffNoBox.Text.Trim();
            if (_tariffs.Any(t => t.TariffNo.Equals(tariffNo, StringComparison.OrdinalIgnoreCase)))
            {
                MessageBox.Show("Tariff number already used or duplicate entry.", "Duplicate tariff", MessageBoxButton.OK, MessageBoxImage.Warning);
                return;
            }

            _tariffs.Add(new Tariff(tariffNo, ComboText(customer), ComboText(origin), ComboText(destination), ComboText(mainSection), weightSection.SelectedItem?.ToString() ?? "Minimum", rateType.SelectedItem?.ToString() ?? "Per KG", Parse(rate.Text), Parse(min.Text), 5000, "2026-01-01", "2026-12-31", _currentUser.UserName));
            AddHistory("Created tariff", tariffNo);
            MessageBox.Show($"Tariff {tariffNo} created.", "Apollo Freight ERP");
        }));
        form.Children.Add(ActionButton("Run Price Simulation", () => MessageBox.Show("Simulation: 1040 KG x 0.420 = 436.800 + surcharges.", "Apollo Freight ERP")));
        root.Children.Add(Panel("Tariff Actions", PopupLaunchPanel("New / Edit Tariff", "New Tariff", form, "Open the popup to create, search, update, or simulate customer rates.")));
        Grid.SetColumn(root.Children[^1], 1);
        return root;
    }

    private UIElement BuildDocuments()
    {
        var root = TwoColumnLayout();
        var docPanel = new StackPanel();
        var docSearch = new ComboBox { ItemsSource = _documents.SelectMany(d => new[] { d.DocumentNo, d.LinkedNo, d.Type }).Distinct().ToList(), IsEditable = true, Padding = new Thickness(8), BorderBrush = Brush("#C7D2DE"), MinWidth = 220 };
        var documentGrid = DataGridFor(ApplyDateRangeFilter(_documents).ToList(), 390, false);
        docPanel.Children.Add(documentGrid);
        docPanel.Children.Add(ActionButton("Save Changes / Add History", () =>
        {
            if (!ValidateAllUniqueNumbers(out var message))
            {
                MessageBox.Show(message, "Duplicate entry", MessageBoxButton.OK, MessageBoxImage.Warning);
                return;
            }

            AddHistory("Edited document library", "Documents");
        }));
        root.Children.Add(Panel("Document Library", docPanel));
        Grid.SetColumn(root.Children[^1], 0);

        var attachTo = new ComboBox { ItemsSource = _shipments.Select(s => s.JobNo).ToList(), IsEditable = true, Text = "AFS-2605003", Padding = new Thickness(8), BorderBrush = Brush("#C7D2DE") };
        var docType = new ComboBox { ItemsSource = new[] { "Waybill", "LR", "CMR", "Commercial Invoice", "Packing List", "POD", "Supplier Invoice" }, SelectedIndex = 5, Padding = new Thickness(8), BorderBrush = Brush("#C7D2DE") };
        var owner = new TextBox { Text = "delivery", Padding = new Thickness(8), BorderBrush = Brush("#C7D2DE") };
        var docStatus = new ComboBox { ItemsSource = new[] { "Uploaded", "Attached", "Missing", "Issued", "Stored", "Replaced" }, SelectedIndex = 0, IsEditable = true, Padding = new Thickness(8), BorderBrush = Brush("#C7D2DE") };
        var form = new StackPanel();
        form.Children.Add(new TextBlock { Text = "Search previous document here, then update from this same panel.", TextWrapping = TextWrapping.Wrap, Foreground = Brush("#687582"), Margin = new Thickness(0, 0, 0, 8) });
        form.Children.Add(Labelled("Search Document / Job / Type", docSearch));
        form.Children.Add(ActionButton("Load Document", () =>
        {
            var key = ComboText(docSearch);
            var found = _documents.FirstOrDefault(d =>
                d.DocumentNo.Equals(key, StringComparison.OrdinalIgnoreCase) ||
                d.LinkedNo.Equals(key, StringComparison.OrdinalIgnoreCase) ||
                d.Type.Equals(key, StringComparison.OrdinalIgnoreCase));
            if (found is null)
            {
                MessageBox.Show("Document not found.", "Apollo Freight ERP", MessageBoxButton.OK, MessageBoxImage.Warning);
                return;
            }

            docSearch.Text = found.DocumentNo;
            attachTo.Text = found.LinkedNo;
            docType.SelectedItem = found.Type;
            docStatus.Text = found.Status;
            owner.Text = found.Owner;
            documentGrid.ItemsSource = new[] { found };
        }));
        form.Children.Add(ActionButton("Update Document Tag", () =>
        {
            var found = _documents.FirstOrDefault(d => d.DocumentNo.Equals(ComboText(docSearch), StringComparison.OrdinalIgnoreCase));
            if (found is null)
            {
                MessageBox.Show("Load a document first.", "Apollo Freight ERP", MessageBoxButton.OK, MessageBoxImage.Warning);
                return;
            }

            found.LinkedNo = ComboText(attachTo);
            found.Type = docType.SelectedItem?.ToString() ?? found.Type;
            found.Status = ComboText(docStatus);
            found.Owner = owner.Text;
            AddHistory("Updated document tag from right panel", found.DocumentNo);
            NavigationList.SelectedItem = "Documents";
        }));
        form.Children.Add(new Border { Height = 1, Background = Brush("#DDE4EC"), Margin = new Thickness(0, 14, 0, 14) });
        form.Children.Add(Labelled("Attach To", attachTo));
        form.Children.Add(Labelled("Document Type", docType));
        form.Children.Add(Labelled("Status", docStatus));
        form.Children.Add(Labelled("Owner", owner));
        form.Children.Add(ActionButton("Upload / Replace Document", () =>
        {
            var dialog = new OpenFileDialog { Title = "Select document", Filter = "Documents|*.pdf;*.jpg;*.jpeg;*.png;*.docx;*.xlsx|All files|*.*" };
            if (dialog.ShowDialog() != true)
            {
                return;
            }

            var docNo = NextAvailableNumber("DOC");
            if (_documents.Any(d => d.DocumentNo.Equals(docNo, StringComparison.OrdinalIgnoreCase)))
            {
                MessageBox.Show("Document number already used or duplicate entry.", "Duplicate document", MessageBoxButton.OK, MessageBoxImage.Warning);
                return;
            }

            _documents.Add(new DocumentItem(docNo, ComboText(attachTo), docType.SelectedItem?.ToString() ?? "Document", "Uploaded", DateTime.Today.ToString("yyyy-MM-dd"), owner.Text));
            AddHistory("Uploaded document", $"{docNo} - {Path.GetFileName(dialog.FileName)}");
            MessageBox.Show($"Document {docNo} uploaded and linked to {ComboText(attachTo)}.", "Apollo Freight ERP");
        }));
        form.Children.Add(new TextBlock { Text = "Required document types: Waybill, LR, CMR, commercial invoice, packing list, POD, supplier invoice.", TextWrapping = TextWrapping.Wrap, Foreground = Brush("#5F6D7A"), Margin = new Thickness(0, 14, 0, 0) });
        root.Children.Add(Panel("Document Actions", PopupLaunchPanel("Upload / Tag Document", "New Document", form, "Open the popup to upload, replace, search, or update document tags.")));
        Grid.SetColumn(root.Children[^1], 1);
        return root;
    }

    private UIElement BuildInvoices()
    {
        var root = TwoColumnLayout();
        var invoicePanel = new StackPanel();
        var allowedInvoices = VisibleInvoices().ToList();
        var filteredInvoices = ApplyDateRangeFilter(allowedInvoices).ToList();
        var invoiceSearch = new ComboBox { ItemsSource = allowedInvoices.SelectMany(i => new[] { i.InvoiceNo, i.Customer, i.ShipmentNo }).Distinct().ToList(), IsEditable = true, Padding = new Thickness(8), BorderBrush = Brush("#C7D2DE"), MinWidth = 220 };
        var invoiceGrid = DataGridFor(filteredInvoices, 390, false);
        invoicePanel.Children.Add(invoiceGrid);
        invoicePanel.Children.Add(ActionButton("Save Changes / Add History", () =>
        {
            if (!ValidateAllUniqueNumbers(out var message))
            {
                MessageBox.Show(message, "Duplicate entry", MessageBoxButton.OK, MessageBoxImage.Warning);
                return;
            }

            AddHistory("Edited invoice register", "Billing / Invoices");
        }));
        root.Children.Add(Panel("Invoice Register", invoicePanel));
        Grid.SetColumn(root.Children[^1], 0);

        var customer = new ComboBox { ItemsSource = VisibleParties(_customers).Select(c => c.Name).ToList(), IsEditable = true, Text = "Al Noor Projects", Padding = new Thickness(8), BorderBrush = Brush("#C7D2DE") };
        var shipmentNo = new ComboBox { IsEditable = true, Text = "AFS-2605003", Padding = new Thickness(8), BorderBrush = Brush("#C7D2DE") };
        void RefreshInvoiceShipmentList()
        {
            var selectedCustomer = ComboText(customer);
            shipmentNo.ItemsSource = VisibleShipments()
                .Where(s => string.IsNullOrWhiteSpace(selectedCustomer) || s.Customer.Equals(selectedCustomer, StringComparison.OrdinalIgnoreCase))
                .Select(s => s.JobNo)
                .ToList();
        }

        RefreshInvoiceShipmentList();
        customer.SelectionChanged += (_, _) => RefreshInvoiceShipmentList();
        customer.LostFocus += (_, _) => RefreshInvoiceShipmentList();
        var revenue = new TextBox { Text = "780.000", Padding = new Thickness(8), BorderBrush = Brush("#C7D2DE") };
        var cost = new TextBox { Text = "590.000", Padding = new Thickness(8), BorderBrush = Brush("#C7D2DE") };
        var status = new ComboBox { ItemsSource = new[] { "Draft", "Approved", "Sent", "Paid", "Overdue" }, SelectedIndex = 0, Padding = new Thickness(8), BorderBrush = Brush("#C7D2DE") };
        var form = new StackPanel();
        form.Children.Add(new TextBlock { Text = "Search previous invoice here, then update from this same panel.", TextWrapping = TextWrapping.Wrap, Foreground = Brush("#687582"), Margin = new Thickness(0, 0, 0, 8) });
        form.Children.Add(Labelled("Search Invoice / Job / Customer", invoiceSearch));
        form.Children.Add(ActionButton("Load Invoice", () =>
        {
            var key = ComboText(invoiceSearch);
            var found = VisibleInvoices().FirstOrDefault(i =>
                i.InvoiceNo.Equals(key, StringComparison.OrdinalIgnoreCase) ||
                i.ShipmentNo.Equals(key, StringComparison.OrdinalIgnoreCase) ||
                i.Customer.Equals(key, StringComparison.OrdinalIgnoreCase));
            if (found is null)
            {
                MessageBox.Show("Invoice not found or no permission.", "Apollo Freight ERP", MessageBoxButton.OK, MessageBoxImage.Warning);
                return;
            }

            invoiceSearch.Text = found.InvoiceNo;
            customer.Text = found.Customer;
            RefreshInvoiceShipmentList();
            shipmentNo.Text = found.ShipmentNo;
            revenue.Text = found.Revenue.ToString(CultureInfo.InvariantCulture);
            cost.Text = found.SupplierCost.ToString(CultureInfo.InvariantCulture);
            status.SelectedItem = found.Status;
            invoiceGrid.ItemsSource = new[] { found };
        }));
        form.Children.Add(ActionButton("Update Invoice", () =>
        {
            var found = VisibleInvoices().FirstOrDefault(i => i.InvoiceNo.Equals(ComboText(invoiceSearch), StringComparison.OrdinalIgnoreCase));
            if (found is null)
            {
                MessageBox.Show("Load an invoice first.", "Apollo Freight ERP", MessageBoxButton.OK, MessageBoxImage.Warning);
                return;
            }

            found.Customer = ComboText(customer);
            found.ShipmentNo = ComboText(shipmentNo);
            found.Revenue = Parse(revenue.Text);
            found.SupplierCost = Parse(cost.Text);
            found.Status = status.SelectedItem?.ToString() ?? found.Status;
            AddHistory("Updated invoice from right panel", found.InvoiceNo);
            NavigationList.SelectedItem = "Billing / Invoices";
        }));
        form.Children.Add(new Border { Height = 1, Background = Brush("#DDE4EC"), Margin = new Thickness(0, 14, 0, 14) });
        form.Children.Add(Labelled("Customer", customer));
        form.Children.Add(Labelled("Shipment(s)", shipmentNo));
        form.Children.Add(Labelled("Revenue", revenue));
        form.Children.Add(Labelled("Supplier Cost", cost));
        form.Children.Add(Field("Gross Profit", "190.000"));
        form.Children.Add(Labelled("Status", status));
        form.Children.Add(ActionButton("Generate Invoice", () =>
        {
            var invoiceNo = NextAvailableNumber("INV");
            if (_invoices.Any(i => i.InvoiceNo.Equals(invoiceNo, StringComparison.OrdinalIgnoreCase)))
            {
                MessageBox.Show("Invoice number already used or duplicate entry.", "Duplicate invoice", MessageBoxButton.OK, MessageBoxImage.Warning);
                return;
            }

            _invoices.Add(new Invoice(invoiceNo, ComboText(customer), ComboText(shipmentNo), Parse(revenue.Text), Parse(cost.Text), status.SelectedItem?.ToString() ?? "Draft", DateTime.Today.ToString("yyyy-MM-dd"), _currentUser.UserName));
            var shipment = VisibleShipments().FirstOrDefault(s => s.JobNo.Equals(ComboText(shipmentNo), StringComparison.OrdinalIgnoreCase));
            if (shipment is not null)
            {
                shipment.InvoiceStatus = invoiceNo;
            }
            AddHistory("Generated invoice", invoiceNo);
            MessageBox.Show($"Invoice {invoiceNo} generated.", "Apollo Freight ERP");
        }));
        form.Children.Add(ActionButton("Approve Invoice", () => MessageBox.Show("Invoice approval recorded for test. Live version will enforce permission and accounting checks.", "Apollo Freight ERP")));
        root.Children.Add(Panel("Invoice Actions", PopupLaunchPanel("New / Edit Invoice", "New Invoice", form, "Select a customer first; the shipment dropdown will show only that customer's shipments.")));
        Grid.SetColumn(root.Children[^1], 1);
        return root;
    }

    private UIElement BuildPod()
    {
        var root = TwoColumnLayout();
        var podGrid = DataGridFor(ApplyDateRangeFilter(VisibleShipments()).ToList(), 430, false);
        root.Children.Add(Panel("POD Pending / Delivery Board", podGrid));
        Grid.SetColumn(root.Children[^1], 0);

        var jobNo = new ComboBox { ItemsSource = _shipments.Select(s => s.JobNo).ToList(), IsEditable = true, Text = "AFS-2605003", Padding = new Thickness(8), BorderBrush = Brush("#C7D2DE") };
        var receiver = new TextBox { Text = "Receiver Name", Padding = new Thickness(8), BorderBrush = Brush("#C7D2DE") };
        var form = new StackPanel();
        form.Children.Add(Labelled("Shipment No", jobNo));
        form.Children.Add(Labelled("Receiver", receiver));
        form.Children.Add(ActionButton("Load POD Job", () =>
        {
            var shipment = _shipments.FirstOrDefault(s => s.JobNo.Equals(ComboText(jobNo), StringComparison.OrdinalIgnoreCase));
            if (shipment is null)
            {
                MessageBox.Show("Shipment not found.", "Apollo Freight ERP", MessageBoxButton.OK, MessageBoxImage.Warning);
                return;
            }

            podGrid.ItemsSource = new[] { shipment };
        }));
        form.Children.Add(ActionButton("Mark Delivered + Upload POD", () =>
        {
            var shipment = _shipments.FirstOrDefault(s => s.JobNo.Equals(ComboText(jobNo), StringComparison.OrdinalIgnoreCase));
            if (shipment is null)
            {
                MessageBox.Show("Shipment not found.", "Apollo Freight ERP");
                return;
            }

            shipment.Status = "Delivered";
            shipment.PodStatus = "Uploaded";
            _documents.Add(new DocumentItem(NextAvailableNumber("DOC"), shipment.JobNo, "POD", "Uploaded", DateTime.Today.ToString("yyyy-MM-dd"), "delivery"));
            AddHistory("Marked delivered and uploaded POD", $"{shipment.JobNo} - {receiver.Text}");
            MessageBox.Show($"{shipment.JobNo} marked delivered and POD uploaded.", "Apollo Freight ERP");
            NavigationList.SelectedItem = "POD / Delivery";
        }));
        root.Children.Add(Panel("Delivery Actions", PopupLaunchPanel("POD / Delivery Update", "New POD Update", form, "Open the popup to update delivery and POD details.")));
        Grid.SetColumn(root.Children[^1], 1);
        return root;
    }

    private UIElement BuildShipmentStatus()
    {
        var root = TwoColumnLayout();
        var statusPanel = new StackPanel();
        statusPanel.Children.Add(new TextBlock { Text = "Previous shipment entries are editable here. Select any row, change values, then save.", Foreground = Brush("#687582"), Margin = new Thickness(0, 0, 0, 8) });
        var statusSearch = new ComboBox { ItemsSource = VisibleShipments().Select(s => s.JobNo).ToList(), IsEditable = true, Padding = new Thickness(8), BorderBrush = Brush("#C7D2DE"), MinWidth = 180 };
        var statusRows = ApplyDateRangeFilter(VisibleShipments()).ToList();
        var statusFilter = new ComboBox { ItemsSource = new[] { "All Statuses" }.Concat(ShipmentStatusOptions()).ToList(), SelectedIndex = 0, Padding = new Thickness(8), BorderBrush = Brush("#C7D2DE") };
        var podFilter = new ComboBox { ItemsSource = new[] { "All POD" , "Pending", "Uploaded", "Missing", "Disputed", "Approved" }, SelectedIndex = 0, Padding = new Thickness(8), BorderBrush = Brush("#C7D2DE") };
        var customerFilter = new ComboBox { ItemsSource = new[] { "All Customers" }.Concat(VisibleParties(_customers).Select(c => c.Name)).ToList(), SelectedIndex = 0, IsEditable = true, Padding = new Thickness(8), BorderBrush = Brush("#C7D2DE") };
        var transitFilter = new ComboBox { ItemsSource = new[] { "All Transit", "On Time", "Over Transit Days" }, SelectedIndex = 0, Padding = new Thickness(8), BorderBrush = Brush("#C7D2DE") };
        var statusGrid = DataGridFor(statusRows, 390, false);
        ApplyTransitRowColors(statusGrid);
        void RefreshStatusGrid()
        {
            IEnumerable<Shipment> rows = ApplyDateRangeFilter(VisibleShipments());
            var selectedStatus = statusFilter.SelectedItem?.ToString() ?? "All Statuses";
            var selectedPod = podFilter.SelectedItem?.ToString() ?? "All POD";
            var selectedCustomer = ComboText(customerFilter);
            var selectedTransit = transitFilter.SelectedItem?.ToString() ?? "All Transit";
            if (selectedStatus != "All Statuses")
            {
                rows = rows.Where(s => s.Status == selectedStatus);
            }

            if (selectedPod != "All POD")
            {
                rows = rows.Where(s => s.PodStatus == selectedPod);
            }

            if (!string.IsNullOrWhiteSpace(selectedCustomer) && selectedCustomer != "All Customers")
            {
                rows = rows.Where(s => s.Customer.Equals(selectedCustomer, StringComparison.OrdinalIgnoreCase));
            }

            if (selectedTransit == "On Time")
            {
                rows = rows.Where(s => s.CurrentTransitDays <= s.TransitDays);
            }
            else if (selectedTransit == "Over Transit Days")
            {
                rows = rows.Where(s => s.CurrentTransitDays > s.TransitDays);
            }

            statusGrid.ItemsSource = rows.ToList();
        }

        var filterPanel = new UniformGrid { Columns = 4, Margin = new Thickness(0, 0, 0, 12) };
        filterPanel.Children.Add(Labelled("Status", statusFilter));
        filterPanel.Children.Add(Labelled("POD", podFilter));
        filterPanel.Children.Add(Labelled("Customer", customerFilter));
        filterPanel.Children.Add(Labelled("Transit", transitFilter));
        statusPanel.Children.Add(filterPanel);
        statusPanel.Children.Add(ActionButton("Apply Status Filters", RefreshStatusGrid));
        statusPanel.Children.Add(statusGrid);
        statusPanel.Children.Add(ActionButton("Save Status Table Changes", () =>
        {
            if (!ValidateAllUniqueNumbers(out var message))
            {
                MessageBox.Show(message, "Duplicate entry", MessageBoxButton.OK, MessageBoxImage.Warning);
                return;
            }

            AddHistory("Saved shipment status table", _currentUser.BranchAccess);
        }));
        root.Children.Add(Panel("Shipment Status Register", statusPanel));
        Grid.SetColumn(root.Children[^1], 0);

        var jobNo = new ComboBox { ItemsSource = _shipments.Select(s => s.JobNo).ToList(), IsEditable = true, Padding = new Thickness(8), BorderBrush = Brush("#C7D2DE") };
        var status = new ComboBox { ItemsSource = ShipmentStatusOptions(), SelectedIndex = 1, Padding = new Thickness(8), BorderBrush = Brush("#C7D2DE") };
        var podStatus = new ComboBox { ItemsSource = new[] { "Pending", "Uploaded", "Missing", "Disputed", "Approved" }, SelectedIndex = 0, Padding = new Thickness(8), BorderBrush = Brush("#C7D2DE") };
        var invoiceStatus = new ComboBox { ItemsSource = new[] { "Unbilled", "Draft", "Approved", "Sent", "Paid", "Overdue" }, SelectedIndex = 0, IsEditable = true, Padding = new Thickness(8), BorderBrush = Brush("#C7D2DE") };
        var transitDays = new ComboBox { ItemsSource = Enumerable.Range(1, 30).Select(day => day.ToString()).ToList(), SelectedIndex = 2, IsEditable = true, Padding = new Thickness(8), BorderBrush = Brush("#C7D2DE") };
        var notes = new TextBox { Text = "Status update", Padding = new Thickness(8), BorderBrush = Brush("#C7D2DE") };
        var form = new StackPanel();
        form.Children.Add(new TextBlock { Text = "Search previous shipment status here, then update from this same panel.", TextWrapping = TextWrapping.Wrap, Foreground = Brush("#687582"), Margin = new Thickness(0, 0, 0, 8) });
        form.Children.Add(Labelled("Search Job No", statusSearch));
        form.Children.Add(ActionButton("Load Shipment Status", () =>
        {
            var found = _shipments.FirstOrDefault(s => s.JobNo.Equals(ComboText(statusSearch), StringComparison.OrdinalIgnoreCase));
            if (found is null)
            {
                MessageBox.Show("Shipment not found.", "Apollo Freight ERP", MessageBoxButton.OK, MessageBoxImage.Warning);
                return;
            }

            jobNo.Text = found.JobNo;
            status.SelectedItem = found.Status;
            podStatus.SelectedItem = found.PodStatus;
            invoiceStatus.Text = found.InvoiceStatus;
            transitDays.Text = found.TransitDays.ToString(CultureInfo.InvariantCulture);
            statusGrid.ItemsSource = new[] { found };
        }));
        form.Children.Add(new Border { Height = 1, Background = Brush("#DDE4EC"), Margin = new Thickness(0, 14, 0, 14) });
        form.Children.Add(Labelled("Job No", jobNo));
        form.Children.Add(Labelled("Shipment Status", status));
        form.Children.Add(Labelled("POD Status", podStatus));
        form.Children.Add(Labelled("Invoice Status", invoiceStatus));
        form.Children.Add(Labelled("Transit Time in Days", transitDays));
        form.Children.Add(Labelled("Notes", notes));
        form.Children.Add(ActionButton("Update Shipment Status", () =>
        {
            var shipment = _shipments.FirstOrDefault(s => s.JobNo.Equals(ComboText(jobNo), StringComparison.OrdinalIgnoreCase));
            if (shipment is null)
            {
                MessageBox.Show("Shipment not found.", "Apollo Freight ERP", MessageBoxButton.OK, MessageBoxImage.Warning);
                return;
            }

            shipment.Status = status.SelectedItem?.ToString() ?? shipment.Status;
            shipment.PodStatus = podStatus.SelectedItem?.ToString() ?? shipment.PodStatus;
            shipment.InvoiceStatus = ComboText(invoiceStatus);
            shipment.TransitDays = ToInt(ComboText(transitDays));
            AddHistory("Updated shipment status", $"{shipment.JobNo} - {shipment.Status} - {notes.Text}");
            MessageBox.Show("Shipment status updated.", "Apollo Freight ERP");
            NavigationList.SelectedItem = "Shipment Status";
        }));
        form.Children.Add(ActionButton("Send Update to Customer", () =>
        {
            var shipment = _shipments.FirstOrDefault(s => s.JobNo.Equals(ComboText(jobNo), StringComparison.OrdinalIgnoreCase));
            if (shipment is null)
            {
                MessageBox.Show("Shipment not found.", "Apollo Freight ERP", MessageBoxButton.OK, MessageBoxImage.Warning);
                return;
            }

            OpenStatusEmail(shipment, notes.Text);
        }));
        root.Children.Add(Panel("Status Actions", PopupLaunchPanel("Shipment Status Update", "New Status Update", form, "Open the popup to update status or send an email update to the customer.")));
        Grid.SetColumn(root.Children[^1], 1);
        return root;
    }

    private UIElement BuildReports()
    {
        var stack = new StackPanel();
        var startDate = new DatePicker { SelectedDate = FromDateFilter.SelectedDate ?? DateTime.Today.AddMonths(-1), Height = 36, BorderBrush = Brush("#C7D2DE") };
        var endDate = new DatePicker { SelectedDate = ToDateFilter.SelectedDate ?? DateTime.Today, Height = 36, BorderBrush = Brush("#C7D2DE") };
        var customerFilter = new ComboBox { ItemsSource = new[] { "All Customers" }.Concat(VisibleParties(_customers).Select(c => c.Name)).ToList(), SelectedIndex = 0, IsEditable = true, Padding = new Thickness(8), BorderBrush = Brush("#C7D2DE") };
        var statusFilter = new ComboBox { ItemsSource = new[] { "All Statuses" }.Concat(ShipmentStatusOptions()).ToList(), SelectedIndex = 0, Padding = new Thickness(8), BorderBrush = Brush("#C7D2DE") };
        var filterPanel = new UniformGrid { Columns = 2, Margin = new Thickness(0, 0, 0, 14) };
        filterPanel.Children.Add(Labelled("From Date", startDate));
        filterPanel.Children.Add(Labelled("To Date", endDate));
        filterPanel.Children.Add(Labelled("Customer", customerFilter));
        filterPanel.Children.Add(Labelled("Status", statusFilter));
        stack.Children.Add(filterPanel);

        IEnumerable<Shipment> Filtered()
        {
            var rows = ReportShipments();
            var from = startDate.SelectedDate?.Date;
            var to = endDate.SelectedDate?.Date;
            var selectedCustomer = ComboText(customerFilter);
            var selectedStatus = statusFilter.SelectedItem?.ToString() ?? "All Statuses";
            if (from is not null)
            {
                rows = rows.Where(s => !DateTime.TryParse(s.BookingDate, out var date) || date.Date >= from.Value);
            }

            if (to is not null)
            {
                rows = rows.Where(s => !DateTime.TryParse(s.BookingDate, out var date) || date.Date <= to.Value);
            }

            if (!string.IsNullOrWhiteSpace(selectedCustomer) && selectedCustomer != "All Customers")
            {
                rows = rows.Where(s => s.Customer.Equals(selectedCustomer, StringComparison.OrdinalIgnoreCase));
            }

            if (selectedStatus != "All Statuses")
            {
                rows = rows.Where(s => s.Status == selectedStatus);
            }

            return rows;
        }

        var previewSummary = new TextBlock { Foreground = Brush("#425E7B"), Margin = new Thickness(0, 0, 0, 8), TextWrapping = TextWrapping.Wrap };
        var previewGrid = DataGridFor(Filtered().ToList(), 390);
        void RefreshPreview()
        {
            var rows = Filtered().ToList();
            previewGrid.ItemsSource = rows;
            previewSummary.Text = $"Preview: {rows.Count} shipment(s) | Revenue {Money(rows.Sum(s => s.Sell))} | Cost {Money(rows.Sum(s => s.BuyCost))} | Gross Profit {Money(rows.Sum(s => s.Sell - s.BuyCost))}";
        }

        RefreshPreview();
        stack.Children.Add(Panel("Preview", new StackPanel
        {
            Children =
            {
                previewSummary,
                previewGrid
            }
        }));

        var exportFormat = new ComboBox { ItemsSource = new[] { "PDF", "Excel CSV" }, SelectedIndex = 0, Padding = new Thickness(8), BorderBrush = Brush("#C7D2DE"), Width = 150 };
        var buttons = new StackPanel { Orientation = Orientation.Horizontal, Margin = new Thickness(0, 16, 0, 0) };
        buttons.Children.Add(ActionButton("Preview Report", RefreshPreview));
        buttons.Children.Add(Labelled("Export As", exportFormat));
        buttons.Children.Add(ActionButton("Export Report", () =>
        {
            var rows = Filtered().ToList();
            if ((exportFormat.SelectedItem?.ToString() ?? "PDF") == "PDF")
            {
                ExportShipmentsPdf(rows);
            }
            else
            {
                ExportShipmentsCsv(rows);
            }
        }));
        buttons.Children.Add(ActionButton("Margin Summary", () => MessageBox.Show($"Current margin: {Money(Filtered().Sum(s => s.Sell - s.BuyCost))}", "Margin Report")));
        stack.Children.Add(buttons);
        return Panel("Report Preview and Export", stack);
    }

    private UIElement BuildSettings()
    {
        var tabs = new TabControl();
        var userTab = new Grid();
        userTab.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(3, GridUnitType.Star) });
        userTab.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1.35, GridUnitType.Star) });

        var userGrid = DataGridFor(ApplyDateRangeFilter(_users).ToList(), 360, false);
        var userListPanel = new StackPanel();
        userListPanel.Children.Add(new TextBlock { Text = "You can edit user rows directly, then save changes. Select a row before deleting.", Foreground = Brush("#687582"), Margin = new Thickness(0, 0, 0, 8) });
        userListPanel.Children.Add(userGrid);
        var userButtons = new StackPanel { Orientation = Orientation.Horizontal, Margin = new Thickness(0, 12, 0, 0) };
        userButtons.Children.Add(ActionButton("Save User Changes", () =>
        {
            if (!ValidateAllUniqueNumbers(out var message))
            {
                MessageBox.Show(message, "Duplicate entry", MessageBoxButton.OK, MessageBoxImage.Warning);
                return;
            }

            AppData.SaveAll();
            AddHistory("Saved user setting changes", "User Management");
            MessageBox.Show("User changes saved.", "Apollo Freight ERP");
        }));
        userButtons.Children.Add(ActionButton("Delete Selected User", () =>
        {
            if (userGrid.SelectedItem is not UserAccount selectedUser)
            {
                MessageBox.Show("Select a user row first.", "Apollo Freight ERP", MessageBoxButton.OK, MessageBoxImage.Warning);
                return;
            }

            if (selectedUser.UserName.Equals(_currentUser.UserName, StringComparison.OrdinalIgnoreCase))
            {
                MessageBox.Show("You cannot delete the user currently logged in.", "Apollo Freight ERP", MessageBoxButton.OK, MessageBoxImage.Warning);
                return;
            }

            if (selectedUser.Role == "Admin" && _users.Count(user => user.Role == "Admin") <= 1)
            {
                MessageBox.Show("At least one admin user must remain.", "Apollo Freight ERP", MessageBoxButton.OK, MessageBoxImage.Warning);
                return;
            }

            _users.Remove(selectedUser);
            AddHistory("Deleted user account", selectedUser.UserName);
            MessageBox.Show("Selected user deleted.", "Apollo Freight ERP");
        }));
        userListPanel.Children.Add(userButtons);
        userTab.Children.Add(Panel("User Accounts", userListPanel));
        Grid.SetColumn(userTab.Children[^1], 0);

        var userName = new TextBox { Padding = new Thickness(8), BorderBrush = Brush("#C7D2DE") };
        var password = new PasswordBox { Padding = new Thickness(8), BorderBrush = Brush("#C7D2DE") };
        var email = new TextBox { Padding = new Thickness(8), BorderBrush = Brush("#C7D2DE") };
        var role = new ComboBox { ItemsSource = new[] { "Admin", "Operations", "Billing", "Management", "Read-only" }, SelectedIndex = 1, Padding = new Thickness(8), BorderBrush = Brush("#C7D2DE") };
        var accountStatus = new ComboBox { ItemsSource = new[] { "Active", "Inactive", "Locked" }, SelectedIndex = 0, Padding = new Thickness(8), BorderBrush = Brush("#C7D2DE") };
        var branchAccess = new ComboBox { ItemsSource = new[] { "Branch 1", "Branch 2", "Both" }, SelectedIndex = 0, Padding = new Thickness(8), BorderBrush = Brush("#C7D2DE") };
        var viewAll = new CheckBox { Content = "User can view all entry", Margin = new Thickness(0, 8, 0, 4) };
        var viewSelf = new CheckBox { Content = "User can view only self entry", IsChecked = true, Margin = new Thickness(0, 4, 0, 4) };
        var editAll = new CheckBox { Content = "User can edit all entry", Margin = new Thickness(0, 4, 0, 4) };
        var viewHistory = new CheckBox { Content = "User can view updated history", IsChecked = true, Margin = new Thickness(0, 4, 0, 12) };

        var form = new StackPanel();
        form.Children.Add(Labelled("User name", userName));
        form.Children.Add(Labelled("Password", password));
        form.Children.Add(Labelled("Email", email));
        form.Children.Add(Labelled("User role", role));
        form.Children.Add(Labelled("User account", accountStatus));
        form.Children.Add(Labelled("Branch access", branchAccess));
        form.Children.Add(viewAll);
        form.Children.Add(viewSelf);
        form.Children.Add(editAll);
        form.Children.Add(viewHistory);
        form.Children.Add(ActionButton("Create User", () =>
        {
            if (string.IsNullOrWhiteSpace(userName.Text) || string.IsNullOrWhiteSpace(password.Password) || string.IsNullOrWhiteSpace(email.Text))
            {
                MessageBox.Show("User name, password, and email are required.", "Create user", MessageBoxButton.OK, MessageBoxImage.Warning);
                return;
            }

            if (_users.Any(user => user.UserName.Equals(userName.Text.Trim(), StringComparison.OrdinalIgnoreCase)))
            {
                MessageBox.Show("User name already used or duplicate entry.", "Duplicate user", MessageBoxButton.OK, MessageBoxImage.Warning);
                return;
            }

            if (_users.Any(user => user.Email.Equals(email.Text.Trim(), StringComparison.OrdinalIgnoreCase)))
            {
                MessageBox.Show("Email already used or duplicate entry.", "Duplicate email", MessageBoxButton.OK, MessageBoxImage.Warning);
                return;
            }

            _users.Add(new UserAccount(
                userName.Text.Trim(),
                email.Text.Trim(),
                role.SelectedItem?.ToString() ?? "Operations",
                accountStatus.SelectedItem?.ToString() ?? "Active",
                branchAccess.SelectedItem?.ToString() ?? "Branch 1",
                password.Password,
                viewAll.IsChecked == true,
                viewSelf.IsChecked == true,
                editAll.IsChecked == true,
                viewHistory.IsChecked == true,
                "Created from admin panel"));

            AddHistory("Created user account", $"{userName.Text.Trim()} - {branchAccess.SelectedItem}");
            MessageBox.Show("User created for test application. Live version will store this in the server database.", "Create user", MessageBoxButton.OK, MessageBoxImage.Information);
        }));
        userTab.Children.Add(Panel("Create User / Permissions", form));
        Grid.SetColumn(userTab.Children[^1], 1);

        tabs.Items.Add(new TabItem { Header = "Users", Content = userTab });

        var roles = new[]
        {
            new { Role = "Admin", TariffEdit = true, ChargeOverride = true, InvoiceApprove = true, Financials = true },
            new { Role = "Operations", TariffEdit = false, ChargeOverride = false, InvoiceApprove = false, Financials = false },
            new { Role = "Billing", TariffEdit = false, ChargeOverride = true, InvoiceApprove = true, Financials = true },
            new { Role = "Management", TariffEdit = false, ChargeOverride = false, InvoiceApprove = false, Financials = true },
            new { Role = "Read-only", TariffEdit = false, ChargeOverride = false, InvoiceApprove = false, Financials = false }
        };
        tabs.Items.Add(new TabItem { Header = "Role Permissions", Content = Panel("Roles and Permissions", DataGridFor(roles, 420)) });

        var companyName = new TextBox { Text = AppData.Settings.CompanyName, Padding = new Thickness(8), BorderBrush = Brush("#C7D2DE") };
        var shipmentFormat = new TextBox { Text = AppData.Settings.ShipmentNumberFormat, Padding = new Thickness(8), BorderBrush = Brush("#C7D2DE") };
        var invoiceFormat = new TextBox { Text = AppData.Settings.InvoiceNumberFormat, Padding = new Thickness(8), BorderBrush = Brush("#C7D2DE") };
        var divisor = new TextBox { Text = AppData.Settings.DefaultVolumetricDivisor, Padding = new Thickness(8), BorderBrush = Brush("#C7D2DE") };
        var requirePod = new ComboBox { ItemsSource = new[] { "Yes", "No" }, SelectedItem = AppData.Settings.RequirePodBeforeInvoice, Padding = new Thickness(8), BorderBrush = Brush("#C7D2DE") };
        var branches = new TextBox { Text = AppData.Settings.Branches, Padding = new Thickness(8), BorderBrush = Brush("#C7D2DE") };
        var statuses = new TextBox { Text = AppData.Settings.StatusMasters, Padding = new Thickness(8), BorderBrush = Brush("#C7D2DE") };
        var logoFile = new TextBox { Text = AppData.Settings.LogoFile, Padding = new Thickness(8), BorderBrush = Brush("#C7D2DE") };

        var settings = new StackPanel();
        settings.Children.Add(Labelled("Company Name", companyName));
        settings.Children.Add(Labelled("Shipment Number Format", shipmentFormat));
        settings.Children.Add(Labelled("Invoice Number Format", invoiceFormat));
        settings.Children.Add(Labelled("Default Volumetric Divisor", divisor));
        settings.Children.Add(Labelled("Require POD Before Invoice", requirePod));
        settings.Children.Add(Labelled("Branches", branches));
        settings.Children.Add(Labelled("Status Masters", statuses));
        settings.Children.Add(Labelled("Logo File", logoFile));
        settings.Children.Add(ActionButton("Save Company Settings", () =>
        {
            AppData.Settings.CompanyName = companyName.Text;
            AppData.Settings.ShipmentNumberFormat = shipmentFormat.Text;
            AppData.Settings.InvoiceNumberFormat = invoiceFormat.Text;
            AppData.Settings.DefaultVolumetricDivisor = divisor.Text;
            AppData.Settings.RequirePodBeforeInvoice = requirePod.SelectedItem?.ToString() ?? "Yes";
            AppData.Settings.Branches = branches.Text;
            AppData.Settings.StatusMasters = statuses.Text;
            AppData.Settings.LogoFile = logoFile.Text;
            AddHistory("Saved company settings", AppData.Settings.CompanyName);
            MessageBox.Show("Company settings saved.", "Apollo Freight ERP");
        }));
        tabs.Items.Add(new TabItem { Header = "Company Settings", Content = Panel("Company Settings", settings) });

        var requestGrid = DataGridFor(ApplyDateRangeFilter(_unblockRequests).ToList(), 360, false);
        var requestPanel = new StackPanel();
        requestPanel.Children.Add(new TextBlock { Text = "Staff unblock requests appear here. Admin can approve or decline.", Foreground = Brush("#687582"), Margin = new Thickness(0, 0, 0, 8) });
        requestPanel.Children.Add(requestGrid);
        var requestButtons = new StackPanel { Orientation = Orientation.Horizontal, Margin = new Thickness(0, 12, 0, 0) };
        requestButtons.Children.Add(ActionButton("Approve Selected", () =>
        {
            if (_currentUser.Role != "Admin")
            {
                MessageBox.Show("Only admin can approve unblock requests.", "Apollo Freight ERP", MessageBoxButton.OK, MessageBoxImage.Warning);
                return;
            }

            if (requestGrid.SelectedItem is not UnblockRequest request)
            {
                MessageBox.Show("Select a request first.", "Apollo Freight ERP", MessageBoxButton.OK, MessageBoxImage.Warning);
                return;
            }

            var customer = _customers.FirstOrDefault(c => c.Name.Equals(request.CustomerName, StringComparison.OrdinalIgnoreCase));
            if (customer is not null)
            {
                customer.IsAccountOverdue = false;
                customer.Status = "Active";
            }
            request.Status = "Approved";
            AddHistory("Approved unblock request", $"{request.RequestNo} - {request.CustomerName}");
            MessageBox.Show("Unblock request approved.", "Apollo Freight ERP");
        }));
        requestButtons.Children.Add(ActionButton("Decline Selected", () =>
        {
            if (_currentUser.Role != "Admin")
            {
                MessageBox.Show("Only admin can decline unblock requests.", "Apollo Freight ERP", MessageBoxButton.OK, MessageBoxImage.Warning);
                return;
            }

            if (requestGrid.SelectedItem is not UnblockRequest request)
            {
                MessageBox.Show("Select a request first.", "Apollo Freight ERP", MessageBoxButton.OK, MessageBoxImage.Warning);
                return;
            }

            request.Status = "Declined";
            AddHistory("Declined unblock request", $"{request.RequestNo} - {request.CustomerName}");
            MessageBox.Show("Unblock request declined.", "Apollo Freight ERP");
        }));
        requestPanel.Children.Add(requestButtons);
        tabs.Items.Add(new TabItem { Header = "Unblock Requests", Content = Panel("Customer Unblock Requests", requestPanel) });

        var adminRequestGrid = DataGridFor(ApplyDateRangeFilter(_adminRequests).ToList(), 360, false);
        var adminRequestPanel = new StackPanel();
        adminRequestPanel.Children.Add(new TextBlock { Text = "Manifest and staff approval requests appear here. Admin can approve or cancel the pending draft.", Foreground = Brush("#687582"), Margin = new Thickness(0, 0, 0, 8), TextWrapping = TextWrapping.Wrap });
        adminRequestPanel.Children.Add(adminRequestGrid);
        var adminRequestButtons = new StackPanel { Orientation = Orientation.Horizontal, Margin = new Thickness(0, 12, 0, 0) };
        adminRequestButtons.Children.Add(ActionButton("Approve Selected Request", () =>
        {
            if (adminRequestGrid.SelectedItem is not AdminRequest request)
            {
                MessageBox.Show("Select an admin request first.", "Apollo Freight ERP", MessageBoxButton.OK, MessageBoxImage.Warning);
                return;
            }

            if (request.Status != "Pending")
            {
                MessageBox.Show("Only pending requests can be approved.", "Apollo Freight ERP", MessageBoxButton.OK, MessageBoxImage.Warning);
                return;
            }

            ApproveAdminRequest(request);
            MessageBox.Show("Admin request approved and applied.", "Apollo Freight ERP", MessageBoxButton.OK, MessageBoxImage.Information);
            RefreshCurrentModule();
        }));
        adminRequestButtons.Children.Add(ActionButton("Cancel Selected Request", () =>
        {
            if (adminRequestGrid.SelectedItem is not AdminRequest request)
            {
                MessageBox.Show("Select an admin request first.", "Apollo Freight ERP", MessageBoxButton.OK, MessageBoxImage.Warning);
                return;
            }

            request.Status = "Cancelled";
            var load = _loads.FirstOrDefault(l => l.LoadNo.Equals(request.ReferenceNo, StringComparison.OrdinalIgnoreCase));
            if (load is not null && load.LastManifestRequestNo == request.RequestNo)
            {
                load.ManifestStatus = "Cancelled";
            }

            AddHistory("Cancelled admin request", $"{request.RequestNo} - {request.ReferenceNo}");
            MessageBox.Show("Admin request cancelled.", "Apollo Freight ERP", MessageBoxButton.OK, MessageBoxImage.Information);
            RefreshCurrentModule();
        }));
        adminRequestPanel.Children.Add(adminRequestButtons);
        tabs.Items.Add(new TabItem { Header = "Admin Requests", Content = Panel("Approval Requests", adminRequestPanel) });

        var history = new[]
        {
            new { Entry = "AFS-2605001", CreatedBy = "operations", CreatedOn = "2026-05-05 09:15", LastUpdatedBy = "admin", LastUpdatedOn = "2026-05-05 10:22", Change = "Rate override warning reviewed" },
            new { Entry = "INV-260001", CreatedBy = "billing", CreatedOn = "2026-05-05 10:05", LastUpdatedBy = "billing", LastUpdatedOn = "2026-05-05 10:05", Change = "Invoice generated" },
            new { Entry = "admin", CreatedBy = "system", CreatedOn = "2026-05-05 00:00", LastUpdatedBy = "admin", LastUpdatedOn = "2026-05-05 10:30", Change = "Temporary admin enabled" }
        };
        tabs.Items.Add(new TabItem { Header = "Updated History", Content = Panel("Entry Create / Update History", DataGridFor(history, 420)) });
        return tabs;
    }

    private UIElement BuildAudit()
    {
        return Panel("Audit Trail", DataGridFor(ApplyDateRangeFilter(VisibleAudit()).ToList(), 520));
    }

    private FrameworkElement BuildCalculator()
    {
        var actual = new TextBox { Text = "820", Margin = new Thickness(0, 0, 0, 8), Padding = new Thickness(8) };
        var length = new TextBox { Text = "120", Margin = new Thickness(0, 0, 0, 8), Padding = new Thickness(8) };
        var width = new TextBox { Text = "100", Margin = new Thickness(0, 0, 0, 8), Padding = new Thickness(8) };
        var height = new TextBox { Text = "86.7", Margin = new Thickness(0, 0, 0, 8), Padding = new Thickness(8) };
        var pieces = new TextBox { Text = "5", Margin = new Thickness(0, 0, 0, 8), Padding = new Thickness(8) };
        var result = new TextBlock { FontSize = 14, FontWeight = FontWeights.SemiBold, Foreground = Brush("#16202A"), Margin = new Thickness(0, 8, 0, 0) };

        void Calculate()
        {
            var actualKg = Parse(actual.Text);
            var volumeKg = Parse(length.Text) * Parse(width.Text) * Parse(height.Text) * Parse(pieces.Text) / 5000;
            var chargeable = Math.Max(actualKg, volumeKg);
            result.Text = $"Volumetric: {volumeKg:N1} KG | Chargeable: {chargeable:N1} KG | Est. sell: {Math.Max(chargeable * 0.42m, 35m):N3}";
        }

        var button = ActionButton("Calculate Chargeable Weight", Calculate);
        Calculate();

        var form = new StackPanel();
        form.Children.Add(new TextBlock { Text = "Actual KG" });
        form.Children.Add(actual);
        form.Children.Add(new TextBlock { Text = "Length CM" });
        form.Children.Add(length);
        form.Children.Add(new TextBlock { Text = "Width CM" });
        form.Children.Add(width);
        form.Children.Add(new TextBlock { Text = "Height CM" });
        form.Children.Add(height);
        form.Children.Add(new TextBlock { Text = "Pieces" });
        form.Children.Add(pieces);
        form.Children.Add(button);
        form.Children.Add(result);
        return form;
    }

    private static decimal Parse(string value)
    {
        return decimal.TryParse(value, NumberStyles.Any, CultureInfo.InvariantCulture, out var parsed) ? parsed : 0m;
    }

    private static int ToInt(string value)
    {
        return int.TryParse(value, NumberStyles.Any, CultureInfo.InvariantCulture, out var parsed) ? parsed : 0;
    }

    private static double ToDouble(string value)
    {
        return double.TryParse(value, NumberStyles.Any, CultureInfo.InvariantCulture, out var parsed) ? parsed : 0d;
    }

    private IEnumerable<T> ApplyDateRangeFilter<T>(IEnumerable<T> source)
    {
        var from = FromDateFilter.SelectedDate?.Date;
        var to = ToDateFilter.SelectedDate?.Date;
        if (from is null && to is null)
        {
            return source;
        }

        return source.Where(item => MatchesDateRange(item, from, to));
    }

    private static bool MatchesDateRange(object? record, DateTime? from, DateTime? to)
    {
        if (!TryResolveRecordDate(record, out var recordDate))
        {
            return true;
        }

        if (from is not null && recordDate.Date < from.Value)
        {
            return false;
        }

        if (to is not null && recordDate.Date > to.Value)
        {
            return false;
        }

        return true;
    }

    private static bool TryResolveRecordDate(object? record, out DateTime date)
    {
        date = default;
        if (record is null)
        {
            return false;
        }

        return record switch
        {
            Shipment shipment => ParseDate(shipment.BookingDate, out date),
            ConsolidationLoad load => ParseDate(load.TripDate, out date),
            Party party => ParseDate(party.CreatedDate, out date),
            Tariff tariff => ParseDate(tariff.EffectiveFrom, out date),
            DocumentItem document => ParseDate(document.Date, out date),
            Invoice invoice => ParseDate(invoice.Date, out date),
            AuditEntry audit => ParseDate(audit.DateTime, out date),
            UserAccount user => ParseDate(user.CreatedDate, out date),
            UnblockRequest request => ParseDate(request.Date, out date),
            AdminRequest request => ParseDate(request.Date, out date),
            CustomerDeposit deposit => ParseDate(deposit.Date, out date),
            _ => TryResolveRecordDateByReflection(record, out date)
        };
    }

    private static bool TryResolveRecordDateByReflection(object record, out DateTime date)
    {
        date = default;
        var candidates = new[] { "BookingDate", "TripDate", "CreatedDate", "Date", "DateTime", "EffectiveFrom" };
        foreach (var propertyName in candidates)
        {
            var property = record.GetType().GetProperty(propertyName, BindingFlags.Public | BindingFlags.Instance);
            var value = property?.GetValue(record)?.ToString();
            if (!string.IsNullOrWhiteSpace(value) && ParseDate(value, out date))
            {
                return true;
            }
        }

        return false;
    }

    internal static bool ParseDate(string? value, out DateTime date)
    {
        return DateTime.TryParse(value, CultureInfo.InvariantCulture, DateTimeStyles.AssumeLocal, out date)
            || DateTime.TryParse(value, out date);
    }

    private static DateTime? ParseDate(string? value)
    {
        return ParseDate(value, out var date) ? date : null;
    }

    private static Grid TwoColumnLayout()
    {
        var grid = new Grid();
        grid.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(3, GridUnitType.Star) });
        grid.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1.35, GridUnitType.Star) });
        return grid;
    }

    private FrameworkElement BuildConsolidationTree(ConsolidationLoad load)
    {
        var tree = new TreeView
        {
            BorderBrush = Brush("#DDE4EC"),
            BorderThickness = new Thickness(1),
            Background = Brush("#F9FBFD"),
            Padding = new Thickness(8)
        };

        var root = new TreeViewItem
        {
            Header = $"{load.LoadNo} | {load.Route} | {load.Status} | Manifest: {load.ManifestStatus}",
            IsExpanded = true,
            FontWeight = FontWeights.SemiBold
        };

        var jobs = LoadJobs(load).ToList();
        if (jobs.Count == 0)
        {
            root.Items.Add(new TreeViewItem { Header = "No job numbers linked yet." });
        }
        else
        {
            foreach (var jobNo in jobs)
            {
                var shipment = _shipments.FirstOrDefault(item => item.JobNo.Equals(jobNo, StringComparison.OrdinalIgnoreCase));
                var child = new TreeViewItem
                {
                    Header = shipment is null
                        ? $"{jobNo} | shipment missing"
                        : $"{shipment.JobNo} | {shipment.Customer} | {shipment.Origin} to {shipment.Destination} | {shipment.Status}",
                    Tag = shipment
                };

                child.MouseDoubleClick += (_, args) =>
                {
                    args.Handled = true;
                    if (child.Tag is Shipment selectedShipment)
                    {
                        OpenRecordDetailWindow(selectedShipment);
                    }
                };

                root.Items.Add(child);
            }
        }

        tree.Items.Add(root);

        var summary = new TextBlock
        {
            Text = $"Trip Date: {load.TripDate} | Transporter: {load.Transporter} | Vehicle: {load.VehicleNo} | Pieces: {load.Pieces} | Chargeable KG: {load.ChargeableKg:N0}",
            Foreground = Brush("#425E7B"),
            Margin = new Thickness(0, 8, 0, 8),
            TextWrapping = TextWrapping.Wrap
        };

        var stack = new StackPanel();
        stack.Children.Add(summary);
        stack.Children.Add(tree);
        return stack;
    }

    private FrameworkElement BuildConsolidationBoard(IReadOnlyList<ConsolidationLoad> loads)
    {
        var stack = new StackPanel();
        if (loads.Count == 0)
        {
            stack.Children.Add(new TextBlock
            {
                Text = "No consolidations match the selected date range.",
                Foreground = Brush("#8E3B46")
            });
            return stack;
        }

        foreach (var load in loads.OrderByDescending(load => ParseDate(load.TripDate) ?? DateTime.MinValue).ThenByDescending(load => load.LoadNo))
        {
            stack.Children.Add(BuildConsolidationCard(load));
        }

        return stack;
    }

    private Border BuildConsolidationCard(ConsolidationLoad load)
    {
        var wrapper = new StackPanel();

        var header = new Grid { Margin = new Thickness(0, 0, 0, 10) };
        header.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
        header.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });

        var loadButton = new Button
        {
            Content = load.LoadNo,
            Background = Brushes.Transparent,
            BorderThickness = new Thickness(0),
            Foreground = Brush("#F58220"),
            FontSize = 16,
            FontWeight = FontWeights.Bold,
            Padding = new Thickness(0),
            HorizontalAlignment = HorizontalAlignment.Left,
            Cursor = Cursors.Hand
        };
        loadButton.Click += (_, _) => OpenRecordDetailWindow(load);
        header.Children.Add(loadButton);

        var tripText = new TextBlock
        {
            Text = $"Trip Date: {load.TripDate} | Status: {load.Status}",
            Foreground = Brush("#5F6D7A"),
            VerticalAlignment = VerticalAlignment.Center
        };
        Grid.SetColumn(tripText, 1);
        header.Children.Add(tripText);
        wrapper.Children.Add(header);

        wrapper.Children.Add(new TextBlock
        {
            Text = $"{load.Route} | Vehicle: {load.VehicleNo} | Transporter: {load.Transporter}",
            Foreground = Brush("#425E7B"),
            Margin = new Thickness(0, 0, 0, 8),
            TextWrapping = TextWrapping.Wrap
        });

        wrapper.Children.Add(BuildLoadJobsSummary(load));

        return new Border
        {
            BorderBrush = Brush("#DDE4EC"),
            BorderThickness = new Thickness(1),
            CornerRadius = new CornerRadius(8),
            Background = Brush("#F9FBFD"),
            Padding = new Thickness(14),
            Margin = new Thickness(0, 0, 0, 12),
            Child = wrapper
        };
    }

    private FrameworkElement BuildLoadJobsSummary(ConsolidationLoad load)
    {
        var jobsPanel = new StackPanel();
        var jobs = LoadJobs(load).ToList();
        if (jobs.Count == 0)
        {
            jobsPanel.Children.Add(new TextBlock
            {
                Text = "No job numbers linked yet.",
                Foreground = Brush("#8E3B46")
            });
            return jobsPanel;
        }

        foreach (var jobNo in jobs)
        {
            var shipment = _shipments.FirstOrDefault(item => item.JobNo.Equals(jobNo, StringComparison.OrdinalIgnoreCase));
            if (shipment is null)
            {
                jobsPanel.Children.Add(new TextBlock
                {
                    Text = jobNo,
                    Foreground = Brush("#8E3B46"),
                    Margin = new Thickness(0, 0, 0, 8)
                });
                continue;
            }

            var jobBorder = new Border
            {
                BorderBrush = Brush("#DDE4EC"),
                BorderThickness = new Thickness(1),
                CornerRadius = new CornerRadius(6),
                Background = Brushes.White,
                Padding = new Thickness(10),
                Margin = new Thickness(0, 0, 0, 8),
                Cursor = Cursors.Hand
            };

            var jobStack = new StackPanel();
            jobStack.Children.Add(new TextBlock
            {
                Text = shipment.JobNo,
                FontSize = 14,
                FontWeight = FontWeights.SemiBold,
                Foreground = Brush("#16202A")
            });
            jobStack.Children.Add(new TextBlock
            {
                Text = $"{shipment.Customer} | {shipment.Origin} to {shipment.Destination}",
                Foreground = Brush("#5F6D7A"),
                Margin = new Thickness(0, 3, 0, 0),
                TextWrapping = TextWrapping.Wrap
            });
            jobStack.Children.Add(new TextBlock
            {
                Text = $"Pieces: {shipment.Pieces} | Chargeable KG: {shipment.ChargeableKg:N0} | Status: {shipment.Status}",
                Foreground = Brush("#425E7B"),
                Margin = new Thickness(0, 4, 0, 0)
            });

            jobBorder.Child = jobStack;
            jobBorder.MouseLeftButtonUp += (_, _) => OpenRecordDetailWindow(shipment);
            jobsPanel.Children.Add(jobBorder);
        }

        return jobsPanel;
    }

    private FrameworkElement BuildShipmentPreview(Shipment shipment)
    {
        var stack = new StackPanel();
        stack.Children.Add(new TextBlock
        {
            Text = shipment.JobNo,
            FontSize = 15,
            FontWeight = FontWeights.SemiBold,
            Foreground = Brush("#16202A")
        });
        stack.Children.Add(new TextBlock
        {
            Text = $"{shipment.Customer} | {shipment.Origin} to {shipment.Destination}",
            Foreground = Brush("#5F6D7A"),
            Margin = new Thickness(0, 3, 0, 0),
            TextWrapping = TextWrapping.Wrap
        });
        stack.Children.Add(new TextBlock
        {
            Text = $"Booking Date: {shipment.BookingDate} | Pieces: {shipment.Pieces} | Chargeable KG: {shipment.ChargeableKg:N0}",
            Foreground = Brush("#425E7B"),
            Margin = new Thickness(0, 4, 0, 0),
            TextWrapping = TextWrapping.Wrap
        });
        stack.Children.Add(new TextBlock
        {
            Text = $"Status: {shipment.Status} | POD: {shipment.PodStatus} | Invoice: {shipment.InvoiceStatus}",
            Foreground = Brush("#425E7B"),
            Margin = new Thickness(0, 3, 0, 0),
            TextWrapping = TextWrapping.Wrap
        });
        return new Border
        {
            BorderBrush = Brush("#DDE4EC"),
            BorderThickness = new Thickness(1),
            CornerRadius = new CornerRadius(6),
            Background = Brush("#F9FBFD"),
            Padding = new Thickness(10),
            Margin = new Thickness(0, 0, 0, 10),
            Child = stack
        };
    }

    private static Border Panel(string title, UIElement content)
    {
        var stack = new StackPanel();
        stack.Children.Add(new TextBlock { Text = title, FontSize = 18, FontWeight = FontWeights.SemiBold, Foreground = Brush("#16202A"), Margin = new Thickness(0, 0, 0, 14) });
        stack.Children.Add(content);
        return new Border
        {
            Background = Brushes.White,
            BorderBrush = Brush("#DDE4EC"),
            BorderThickness = new Thickness(1),
            CornerRadius = new CornerRadius(8),
            Padding = new Thickness(18),
            Margin = new Thickness(0, 0, 18, 18),
            Child = stack
        };
    }

    private FrameworkElement PopupLaunchPanel(string title, string buttonText, UIElement popupContent, string? note = null)
    {
        var stack = new StackPanel();
        if (!string.IsNullOrWhiteSpace(note))
        {
            stack.Children.Add(new TextBlock { Text = note, Foreground = Brush("#687582"), TextWrapping = TextWrapping.Wrap, Margin = new Thickness(0, 0, 0, 12) });
        }

        stack.Children.Add(ActionButton(buttonText, () => OpenPopupWindow(title, popupContent)));
        return stack;
    }

    private void OpenPopupWindow(string title, UIElement popupContent)
    {
        var host = new ScrollViewer
        {
            VerticalScrollBarVisibility = ScrollBarVisibility.Auto,
            Content = new Border
            {
                Margin = new Thickness(18),
                Padding = new Thickness(18),
                Background = Brushes.White,
                BorderBrush = Brush("#DDE4EC"),
                BorderThickness = new Thickness(1),
                CornerRadius = new CornerRadius(8),
                Child = popupContent
            }
        };

        var window = new Window
        {
            Title = title,
            Width = 720,
            Height = 780,
            MinWidth = 620,
            MinHeight = 620,
            WindowStartupLocation = WindowStartupLocation.CenterOwner,
            Owner = this,
            Background = Brush("#F4F6F8"),
            Content = host
        };
        window.Closed += (_, _) =>
        {
            if (host.Content is Border border)
            {
                border.Child = null;
            }
        };
        window.ShowDialog();
    }

    private static Border KpiCard(string title, string value, string caption, string color)
    {
        var stack = new StackPanel();
        stack.Children.Add(new TextBlock { Text = title, Foreground = Brush("#5F6D7A"), FontSize = 13 });
        stack.Children.Add(new TextBlock { Text = value, Foreground = Brush(color), FontSize = 27, FontWeight = FontWeights.Bold, Margin = new Thickness(0, 6, 0, 4) });
        stack.Children.Add(new TextBlock { Text = caption, Foreground = Brush("#7B8895"), FontSize = 12 });
        return new Border
        {
            Background = Brushes.White,
            BorderBrush = Brush("#DDE4EC"),
            BorderThickness = new Thickness(1),
            CornerRadius = new CornerRadius(8),
            Padding = new Thickness(16),
            Margin = new Thickness(0, 0, 14, 14),
            Child = stack
        };
    }

    private static Border Alert(string title, string detail)
    {
        var stack = new StackPanel();
        stack.Children.Add(new TextBlock { Text = title, FontWeight = FontWeights.SemiBold, Foreground = Brush("#8E3B46") });
        stack.Children.Add(new TextBlock { Text = detail, TextWrapping = TextWrapping.Wrap, Foreground = Brush("#5F6D7A"), Margin = new Thickness(0, 4, 0, 0) });
        return new Border { BorderBrush = Brush("#E7CAD0"), BorderThickness = new Thickness(1), Background = Brush("#FFF7F8"), CornerRadius = new CornerRadius(6), Padding = new Thickness(12), Margin = new Thickness(0, 0, 0, 10), Child = stack };
    }

    private static Button ActionButton(string text, Action action)
    {
        var button = new Button
        {
            Content = text,
            Height = 38,
            Padding = new Thickness(14, 0, 14, 0),
            Margin = new Thickness(0, 0, 10, 10),
            Background = Brush("#F58220"),
            Foreground = Brushes.White,
            BorderThickness = new Thickness(0),
            HorizontalAlignment = HorizontalAlignment.Left
        };
        button.Click += (_, _) => action();
        return button;
    }

    private static FrameworkElement Field(string label, string value)
    {
        var stack = new StackPanel { Margin = new Thickness(0, 0, 0, 10) };
        stack.Children.Add(new TextBlock { Text = label, Foreground = Brush("#5F6D7A"), FontSize = 12, Margin = new Thickness(0, 0, 0, 3) });
        stack.Children.Add(new TextBox { Text = value, Padding = new Thickness(8), BorderBrush = Brush("#C7D2DE") });
        return stack;
    }

    private static FrameworkElement Labelled(string label, Control control)
    {
        var stack = new StackPanel { Margin = new Thickness(0, 0, 0, 10) };
        stack.Children.Add(new TextBlock { Text = label, Foreground = Brush("#5F6D7A"), FontSize = 12, Margin = new Thickness(0, 0, 0, 3) });
        if (double.IsNaN(control.Height) || control.Height <= 0)
        {
            control.Height = 36;
        }
        stack.Children.Add(control);
        return stack;
    }

    private DataGrid DataGridFor(object source, double maxHeight, bool isReadOnly = true)
    {
        var grid = new DataGrid
        {
            ItemsSource = source as IEnumerable,
            AutoGenerateColumns = true,
            CanUserAddRows = false,
            IsReadOnly = isReadOnly,
            GridLinesVisibility = DataGridGridLinesVisibility.Horizontal,
            HeadersVisibility = DataGridHeadersVisibility.Column,
            AlternatingRowBackground = Brush("#F7FAFC"),
            BorderBrush = Brush("#DDE4EC"),
            RowHeight = 34,
            ColumnHeaderHeight = 36,
            MaxHeight = maxHeight,
            Background = Brushes.White
        };

        grid.ToolTip = "Double-click any row or file number to open full details in another window.";
        grid.MouseDoubleClick += (_, _) =>
        {
            if (grid.SelectedItem is not null)
            {
                OpenRecordDetailWindow(grid.SelectedItem);
            }
        };

        return grid;
    }

    private static void ApplyTransitRowColors(DataGrid grid)
    {
        grid.LoadingRow += (_, args) =>
        {
            if (args.Row.Item is not Shipment shipment)
            {
                return;
            }

            args.Row.Background = shipment.CurrentTransitDays > shipment.TransitDays
                ? Brush("#FBE3E3")
                : Brush("#E5F6EA");
        };
    }

    private FrameworkElement MiniTable(string headers, string rows)
    {
        var data = rows.Split('\n').Select(row =>
        {
            var values = row.Split(',');
            return new Dictionary<string, string>
            {
                [headers.Split(',')[0]] = values.ElementAtOrDefault(0) ?? "",
                [headers.Split(',')[1]] = values.ElementAtOrDefault(1) ?? "",
                [headers.Split(',')[2]] = values.ElementAtOrDefault(2) ?? "",
                [headers.Split(',')[3]] = values.ElementAtOrDefault(3) ?? ""
            };
        }).ToList();
        return DataGridFor(data, 170);
    }

    private void OpenRecordDetailWindow(object? record)
    {
        if (!CanOpenRecordDetail(record))
        {
            return;
        }

        var properties = record!.GetType()
            .GetProperties(BindingFlags.Public | BindingFlags.Instance)
            .Where(property => property.CanRead && property.CanWrite && property.GetIndexParameters().Length == 0)
            .ToList();

        var editorMap = new List<(PropertyInfo Property, FrameworkElement Editor)>();
        var body = new StackPanel { Margin = new Thickness(0, 0, 0, 10) };
        body.Children.Add(new TextBlock
        {
            Text = "Update the full details below, then save the record in this window.",
            Foreground = Brush("#687582"),
            Margin = new Thickness(0, 0, 0, 12),
            TextWrapping = TextWrapping.Wrap
        });

        foreach (var property in properties)
        {
            var editor = CreatePropertyEditor(record, property);
            editorMap.Add((property, editor));
            if (editor is CheckBox checkBox)
            {
                checkBox.Margin = new Thickness(0, 0, 0, 10);
                body.Children.Add(checkBox);
                continue;
            }

            if (editor is Control control)
            {
                body.Children.Add(Labelled(Humanize(property.Name), control));
            }
        }

        var buttons = new StackPanel { Orientation = Orientation.Horizontal };
        Window? window = null;
        var saveButton = ActionButton("Save Changes", () =>
        {
            var pendingValues = new Dictionary<PropertyInfo, object?>();
            foreach (var (property, editor) in editorMap)
            {
                if (!TryReadEditorValue(property, editor, out var convertedValue, out var errorMessage))
                {
                    MessageBox.Show(errorMessage, "Apollo Freight ERP", MessageBoxButton.OK, MessageBoxImage.Warning);
                    return;
                }

                pendingValues[property] = convertedValue;
            }

            if (!ValidateRecordUniqueEdit(record, pendingValues, out var duplicateMessage))
            {
                MessageBox.Show(duplicateMessage, "Duplicate entry", MessageBoxButton.OK, MessageBoxImage.Warning);
                return;
            }

            foreach (var (property, convertedValue) in pendingValues)
            {
                property.SetValue(record, convertedValue);
            }

            NormalizeRecordAfterEdit(record);
            AddHistory($"Updated {Humanize(record.GetType().Name)}", GetRecordReference(record));
            RefreshCurrentModule();
            MessageBox.Show($"{Humanize(record.GetType().Name)} saved.", "Apollo Freight ERP", MessageBoxButton.OK, MessageBoxImage.Information);
            window?.Close();
        });
        buttons.Children.Add(saveButton);

        var closeButton = ActionButton("Close", () => window?.Close());
        closeButton.Background = Brush("#425E7B");
        buttons.Children.Add(closeButton);

        body.Children.Add(buttons);

        window = new Window
        {
            Title = $"{Humanize(record.GetType().Name)} Details - {GetRecordReference(record)}",
            Width = 640,
            Height = 760,
            MinWidth = 560,
            MinHeight = 620,
            WindowStartupLocation = WindowStartupLocation.CenterOwner,
            Owner = this,
            Background = Brush("#F4F6F8"),
            Content = new ScrollViewer
            {
                VerticalScrollBarVisibility = ScrollBarVisibility.Auto,
                Content = new Border
                {
                    Margin = new Thickness(18),
                    Padding = new Thickness(18),
                    Background = Brushes.White,
                    BorderBrush = Brush("#DDE4EC"),
                    BorderThickness = new Thickness(1),
                    CornerRadius = new CornerRadius(8),
                    Child = body
                }
            }
        };

        window.Show();
    }

    private static bool CanOpenRecordDetail(object? record)
    {
        if (record is null || record is string || record is IDictionary)
        {
            return false;
        }

        var type = record.GetType();
        if ((type.FullName ?? string.Empty).Contains("AnonymousType", StringComparison.Ordinal))
        {
            return false;
        }

        return type.GetProperties(BindingFlags.Public | BindingFlags.Instance)
            .Any(property => property.CanRead && property.CanWrite && property.GetIndexParameters().Length == 0);
    }

    private FrameworkElement CreatePropertyEditor(object record, PropertyInfo property)
    {
        var propertyType = Nullable.GetUnderlyingType(property.PropertyType) ?? property.PropertyType;
        var currentValue = property.GetValue(record);
        if (propertyType == typeof(bool))
        {
            return new CheckBox
            {
                Content = Humanize(property.Name),
                IsChecked = currentValue is bool value && value
            };
        }

        if (ShouldUseDatePicker(property))
        {
            return new DatePicker
            {
                SelectedDate = ParseDate(currentValue?.ToString()),
                Height = 36,
                BorderBrush = Brush("#C7D2DE")
            };
        }

        var options = EditorOptionsFor(record.GetType().Name, property.Name);
        if (options is not null)
        {
            var combo = new ComboBox
            {
                ItemsSource = options.ToList(),
                IsEditable = true,
                Padding = new Thickness(8),
                BorderBrush = Brush("#C7D2DE"),
                Text = currentValue?.ToString() ?? string.Empty
            };
            if (!string.IsNullOrWhiteSpace(combo.Text))
            {
                combo.SelectedItem = combo.Items.Cast<object>().FirstOrDefault(item => string.Equals(item?.ToString(), combo.Text, StringComparison.OrdinalIgnoreCase));
            }

            return combo;
        }

        return new TextBox
        {
            Text = currentValue?.ToString() ?? string.Empty,
            Padding = new Thickness(8),
            BorderBrush = Brush("#C7D2DE"),
            AcceptsReturn = property.Name.Equals("Notes", StringComparison.OrdinalIgnoreCase),
            TextWrapping = TextWrapping.Wrap,
            Height = property.Name.Equals("Notes", StringComparison.OrdinalIgnoreCase) ? 80 : 36,
            MinHeight = property.Name.Equals("Notes", StringComparison.OrdinalIgnoreCase) ? 80 : 36
        };
    }

    private static IEnumerable<string>? EditorOptionsFor(string typeName, string propertyName)
    {
        return (typeName, propertyName) switch
        {
            ("Shipment", "Status") => ShipmentStatusOptions(),
            ("Shipment", "PodStatus") => ["Pending", "Uploaded", "Missing", "Disputed", "Approved"],
            ("Shipment", "InvoiceStatus") => ["Unbilled", "Draft", "Approved", "Sent", "Paid", "Overdue", "Missing rate"],
            ("Shipment", "ShipmentDirection") => ["Import", "Export"],
            ("Shipment", "ShipmentService") => ["Consolidation", "SI", "LI", "AI", "Other"],
            ("ConsolidationLoad", "Status") => ["Planned", "Loading", "Dispatched", "Delivered", "Closed"],
            ("Party", "Status") => ["Active", "Inactive", "Blocked"],
            ("Party", "Branch") => ["Branch 1", "Branch 2", "Both"],
            ("Tariff", "RateType") => ["Per KG", "Per CBM", "Per Pallet", "Per Trip"],
            ("DocumentItem", "Type") => ["Waybill", "LR", "CMR", "Commercial Invoice", "Packing List", "POD", "Supplier Invoice"],
            ("DocumentItem", "Status") => ["Uploaded", "Attached", "Missing", "Issued", "Stored", "Replaced"],
            ("Invoice", "Status") => ["Draft", "Approved", "Sent", "Paid", "Overdue"],
            ("UserAccount", "Role") => ["Admin", "Operations", "Billing", "Management", "Read-only"],
            ("UserAccount", "AccountStatus") => ["Active", "Inactive", "Locked"],
            ("UserAccount", "BranchAccess") => ["Branch 1", "Branch 2", "Both"],
            ("UnblockRequest", "Status") => ["Pending", "Approved", "Declined"],
            ("AdminRequest", "Status") => ["Pending", "Approved", "Cancelled"],
            ("AdminRequest", "RequestType") => ["Manifest Approval", "Customer Unblock", "Other"],
            ("CustomerDeposit", "Purpose") => ["Freight deposit", "Credit security", "Advance payment", "Other"],
            ("CustomerDeposit", "Branch") => ["Branch 1", "Branch 2", "Both"],
            _ => null
        };
    }

    private static bool ShouldUseDatePicker(PropertyInfo property)
    {
        if (property.Name.Equals("DateTime", StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        return property.PropertyType == typeof(string)
            && (property.Name.Contains("Date", StringComparison.OrdinalIgnoreCase)
                || property.Name.Equals("EffectiveFrom", StringComparison.OrdinalIgnoreCase)
                || property.Name.Equals("EffectiveTo", StringComparison.OrdinalIgnoreCase));
    }

    private bool TryReadEditorValue(PropertyInfo property, FrameworkElement editor, out object? value, out string errorMessage)
    {
        var propertyType = Nullable.GetUnderlyingType(property.PropertyType) ?? property.PropertyType;
        errorMessage = string.Empty;
        value = null;

        try
        {
            if (editor is CheckBox checkBox)
            {
                value = checkBox.IsChecked == true;
                return true;
            }

            if (editor is DatePicker datePicker)
            {
                value = datePicker.SelectedDate?.ToString("yyyy-MM-dd") ?? string.Empty;
                return true;
            }

            var rawText = editor switch
            {
                TextBox textBox => textBox.Text.Trim(),
                ComboBox comboBox => ComboText(comboBox),
                _ => string.Empty
            };

            if (propertyType == typeof(string))
            {
                value = rawText;
                return true;
            }

            if (propertyType == typeof(int))
            {
                value = ToInt(rawText);
                return true;
            }

            if (propertyType == typeof(double))
            {
                value = ToDouble(rawText);
                return true;
            }

            if (propertyType == typeof(decimal))
            {
                value = Parse(rawText);
                return true;
            }

            value = Convert.ChangeType(rawText, propertyType, CultureInfo.InvariantCulture);
            return true;
        }
        catch
        {
            errorMessage = $"Could not save {Humanize(property.Name)}. Please review the value and try again.";
            return false;
        }
    }

    private void NormalizeRecordAfterEdit(object record)
    {
        switch (record)
        {
            case ConsolidationLoad load:
                RecalculateLoad(load);
                break;
            case Shipment shipment when string.IsNullOrWhiteSpace(shipment.BookingDate):
                shipment.BookingDate = DateTime.Today.ToString("yyyy-MM-dd");
                break;
        }
    }

    private static string GetRecordReference(object record)
    {
        return record switch
        {
            Shipment shipment => shipment.JobNo,
            ConsolidationLoad load => load.LoadNo,
            Party party => party.Code,
            Tariff tariff => tariff.TariffNo,
            DocumentItem document => document.DocumentNo,
            Invoice invoice => invoice.InvoiceNo,
            AuditEntry audit => audit.Reference,
            UserAccount user => user.UserName,
            UnblockRequest request => request.RequestNo,
            AdminRequest request => request.RequestNo,
            CustomerDeposit deposit => deposit.DepositNo,
            _ => record.GetType().Name
        };
    }

    private static string Humanize(string value)
    {
        return string.Concat(value.Select((character, index) =>
            index > 0 && char.IsUpper(character) && !char.IsUpper(value[index - 1])
                ? $" {character}"
                : character.ToString()));
    }

    private static SolidColorBrush Brush(string hex)
    {
        return (SolidColorBrush)new BrushConverter().ConvertFromString(hex)!;
    }

    private static string Money(decimal amount)
    {
        return amount.ToString("N3", CultureInfo.InvariantCulture);
    }

    private static string ComboText(ComboBox combo)
    {
        var text = combo.Text?.Trim();
        return !string.IsNullOrWhiteSpace(text) ? text : combo.SelectedItem?.ToString() ?? string.Empty;
    }

    private static string TariffLabel(Tariff tariff)
    {
        return $"{tariff.TariffNo} | {tariff.Customer} | {tariff.MainSection} | {tariff.WeightSection} | {tariff.RateType} | {tariff.Rate:N3}";
    }

    private static string ExtractTariffNo(string tariffText)
    {
        return tariffText.Split('|', StringSplitOptions.TrimEntries).FirstOrDefault() ?? tariffText;
    }

    private bool ValidateAllUniqueNumbers(out string message)
    {
        return ValidateUnique(_shipments.Select(s => s.JobNo), "Job number", out message)
            && ValidateUnique(_shipments.Select(s => s.AirwayBillNo), "Airway bill number", out message)
            && ValidateUnique(_loads.Select(l => l.LoadNo), "Consolidation number", out message)
            && ValidateUnique(_customers.Select(c => c.Code), "Customer number", out message)
            && ValidateUnique(_customers.Select(c => c.Name), "Customer name", out message)
            && ValidateUnique(_suppliers.Select(s => s.Code), "Supplier number", out message)
            && ValidateUnique(_suppliers.Select(s => s.Name), "Supplier name", out message)
            && ValidateUnique(_tariffs.Select(t => t.TariffNo), "Tariff number", out message)
            && ValidateUnique(_documents.Select(d => d.DocumentNo), "Document number", out message)
            && ValidateUnique(_invoices.Select(i => i.InvoiceNo), "Invoice number", out message)
            && ValidateUnique(_users.Select(u => u.UserName), "User name", out message)
            && ValidateUnique(_users.Select(u => u.Email), "Email", out message)
            && ValidateUnique(_unblockRequests.Select(r => r.RequestNo).Concat(_adminRequests.Select(r => r.RequestNo)), "Request number", out message)
            && ValidateUnique(_customerDeposits.Select(d => d.DepositNo), "Deposit number", out message);
    }

    private static bool ValidateUnique(IEnumerable<string?> values, string label, out string message)
    {
        var duplicate = values
            .Where(value => !string.IsNullOrWhiteSpace(value))
            .GroupBy(value => value!.Trim(), StringComparer.OrdinalIgnoreCase)
            .FirstOrDefault(group => group.Count() > 1);

        if (duplicate is null)
        {
            message = string.Empty;
            return true;
        }

        message = $"{label} '{duplicate.Key}' already used or duplicate entry.";
        return false;
    }

    private bool ValidateRecordUniqueEdit(object record, IReadOnlyDictionary<PropertyInfo, object?> pendingValues, out string message)
    {
        static string Text(IReadOnlyDictionary<PropertyInfo, object?> values, string propertyName)
        {
            return values.FirstOrDefault(pair => pair.Key.Name == propertyName).Value?.ToString()?.Trim() ?? string.Empty;
        }

        message = string.Empty;
        return record switch
        {
            Shipment shipment => ValidateUniqueEditValue(_shipments, shipment, Text(pendingValues, nameof(Shipment.JobNo)), item => item.JobNo, "Job number", out message)
                && ValidateUniqueEditValue(_shipments, shipment, Text(pendingValues, nameof(Shipment.AirwayBillNo)), item => item.AirwayBillNo, "Airway bill number", out message),
            ConsolidationLoad load => ValidateUniqueEditValue(_loads, load, Text(pendingValues, nameof(ConsolidationLoad.LoadNo)), item => item.LoadNo, "Consolidation number", out message),
            Party party => ValidateUniqueEditValue(_customers.Contains(party) ? _customers : _suppliers, party, Text(pendingValues, nameof(Party.Code)), item => item.Code, "Party number", out message)
                && ValidateUniqueEditValue(_customers.Contains(party) ? _customers : _suppliers, party, Text(pendingValues, nameof(Party.Name)), item => item.Name, "Party name", out message),
            Tariff tariff => ValidateUniqueEditValue(_tariffs, tariff, Text(pendingValues, nameof(Tariff.TariffNo)), item => item.TariffNo, "Tariff number", out message),
            DocumentItem document => ValidateUniqueEditValue(_documents, document, Text(pendingValues, nameof(DocumentItem.DocumentNo)), item => item.DocumentNo, "Document number", out message),
            Invoice invoice => ValidateUniqueEditValue(_invoices, invoice, Text(pendingValues, nameof(Invoice.InvoiceNo)), item => item.InvoiceNo, "Invoice number", out message),
            UserAccount user => ValidateUniqueEditValue(_users, user, Text(pendingValues, nameof(UserAccount.UserName)), item => item.UserName, "User name", out message)
                && ValidateUniqueEditValue(_users, user, Text(pendingValues, nameof(UserAccount.Email)), item => item.Email, "Email", out message),
            UnblockRequest request => ValidateUniqueEditValue(_unblockRequests, request, Text(pendingValues, nameof(UnblockRequest.RequestNo)), item => item.RequestNo, "Request number", out message),
            AdminRequest request => ValidateUniqueEditValue(_adminRequests, request, Text(pendingValues, nameof(AdminRequest.RequestNo)), item => item.RequestNo, "Admin request number", out message),
            CustomerDeposit deposit => ValidateUniqueEditValue(_customerDeposits, deposit, Text(pendingValues, nameof(CustomerDeposit.DepositNo)), item => item.DepositNo, "Deposit number", out message),
            _ => true
        };
    }

    private static bool ValidateUniqueEditValue<T>(IEnumerable<T> records, T currentRecord, string proposedValue, Func<T, string> selector, string label, out string message)
        where T : class
    {
        if (string.IsNullOrWhiteSpace(proposedValue))
        {
            message = string.Empty;
            return true;
        }

        if (records.Any(record => !ReferenceEquals(record, currentRecord) && selector(record).Equals(proposedValue, StringComparison.OrdinalIgnoreCase)))
        {
            message = $"{label} '{proposedValue}' already used or duplicate entry.";
            return false;
        }

        message = string.Empty;
        return true;
    }

    private static string[] ShipmentStatusOptions()
    {
        return ["Draft", "Booked", "In-Transit", "Delivered", "Invoiced", "Closed", "Blocked"];
    }

    private string NextAvailableNumber(string prefix)
    {
        var existingValues = prefix switch
        {
            "AFS" => _shipments.Select(shipment => shipment.JobNo),
            "AWB" => _shipments.Select(shipment => shipment.AirwayBillNo),
            "CON" => _loads.Select(load => load.LoadNo),
            "DOC" => _documents.Select(document => document.DocumentNo),
            "TAR" => _tariffs.Select(tariff => tariff.TariffNo),
            "INV" => _invoices.Select(invoice => invoice.InvoiceNo),
            "CUS" => _customers.Select(customer => customer.Code),
            "TRN" => _suppliers.Select(supplier => supplier.Code),
            "REQ" => _unblockRequests.Select(request => request.RequestNo).Concat(_adminRequests.Select(request => request.RequestNo)),
            "DEP" => _customerDeposits.Select(deposit => deposit.DepositNo),
            _ => Enumerable.Empty<string>()
        };

        var nextSequence = existingValues
            .Select(value => ExtractSequence(value, prefix))
            .DefaultIfEmpty(0)
            .Max() + 1;

        return NextNumber(prefix, nextSequence);
    }

    private static int ExtractSequence(string? value, string prefix)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return 0;
        }

        var normalized = value.Trim();
        if (!normalized.StartsWith($"{prefix}-", StringComparison.OrdinalIgnoreCase))
        {
            return 0;
        }

        var digits = new string(normalized.Where(char.IsDigit).ToArray());
        return digits.Length >= 4 && int.TryParse(digits[^4..], out var sequence) ? sequence : 0;
    }

    private static string NextNumber(string prefix, int sequence)
    {
        return $"{prefix}-{DateTime.Today:yyMM}{sequence:0000}";
    }

    private bool DuplicateAirwayBillExists(string airwayBillNo)
    {
        return _shipments.Any(shipment => shipment.AirwayBillNo.Equals(airwayBillNo, StringComparison.OrdinalIgnoreCase));
    }

    private void AddHistory(string action, string reference)
    {
        _audit.Add(new AuditEntry(DateTime.Now.ToString("yyyy-MM-dd HH:mm"), _currentUser.UserName, action, reference));
        if (ValidateAllUniqueNumbers(out var message))
        {
            AppData.SaveAll();
            return;
        }

        MessageBox.Show($"{message}\n\nChanges are kept on screen but were not saved. Correct the duplicate number and save again.", "Duplicate entry", MessageBoxButton.OK, MessageBoxImage.Warning);
    }

    private IEnumerable<Shipment> VisibleShipments()
    {
        if (_currentUser.BranchAccess == "Both")
        {
            return _shipments;
        }

        return _shipments.Where(s => s.Branch == _currentUser.BranchAccess);
    }

    private IEnumerable<Shipment> DashboardShipments()
    {
        if (IsAdmin())
        {
            return _shipments;
        }

        return _shipments.Where(s => s.CreatedBy.Equals(_currentUser.UserName, StringComparison.OrdinalIgnoreCase));
    }

    private IEnumerable<Tariff> VisibleTariffs()
    {
        if (IsAdmin() || _currentUser.CanEditAllEntry)
        {
            return _tariffs;
        }

        return _tariffs.Where(t => t.CreatedBy.Equals(_currentUser.UserName, StringComparison.OrdinalIgnoreCase));
    }

    private IEnumerable<Invoice> VisibleInvoices()
    {
        if (IsAdmin() || _currentUser.CanEditAllEntry)
        {
            return _invoices;
        }

        return _invoices.Where(i => i.CreatedBy.Equals(_currentUser.UserName, StringComparison.OrdinalIgnoreCase));
    }

    private IEnumerable<AuditEntry> VisibleAudit()
    {
        if (IsAdmin() || _currentUser.CanViewAllEntry)
        {
            return _audit;
        }

        return _audit.Where(a => a.User.Equals(_currentUser.UserName, StringComparison.OrdinalIgnoreCase));
    }

    private IEnumerable<Party> VisibleParties(IEnumerable<Party> parties)
    {
        if (_currentUser.BranchAccess == "Both")
        {
            return parties;
        }

        return parties.Where(p => p.Branch == _currentUser.BranchAccess || p.Branch == "Both");
    }

    private IEnumerable<CustomerDeposit> VisibleCustomerDeposits()
    {
        if (_currentUser.BranchAccess == "Both")
        {
            return _customerDeposits;
        }

        return _customerDeposits.Where(deposit => deposit.Branch == _currentUser.BranchAccess || deposit.Branch == "Both");
    }

    private string CustomerBranch(string customerName)
    {
        return _customers.FirstOrDefault(customer => customer.Name.Equals(customerName, StringComparison.OrdinalIgnoreCase))?.Branch
            ?? _currentUser.BranchAccess;
    }

    private void AddJobToLoad(ConsolidationLoad load, string jobNo)
    {
        var jobs = LoadJobs(load).ToList();
        if (!jobs.Any(j => j.Equals(jobNo, StringComparison.OrdinalIgnoreCase)))
        {
            jobs.Add(jobNo);
        }

        load.JobNumbers = string.Join(", ", jobs);
        RecalculateLoad(load);
    }

    private string JobNumbersWith(ConsolidationLoad load, string jobNo)
    {
        var jobs = LoadJobs(load).ToList();
        if (!jobs.Any(j => j.Equals(jobNo, StringComparison.OrdinalIgnoreCase)))
        {
            jobs.Add(jobNo);
        }

        return string.Join(", ", jobs);
    }

    private string JobNumbersWithout(ConsolidationLoad load, string jobNo)
    {
        return string.Join(", ", LoadJobs(load).Where(j => !j.Equals(jobNo, StringComparison.OrdinalIgnoreCase)));
    }

    private void RemoveJobFromLoad(ConsolidationLoad load, string jobNo)
    {
        var jobs = LoadJobs(load).Where(j => !j.Equals(jobNo, StringComparison.OrdinalIgnoreCase)).ToList();
        load.JobNumbers = string.Join(", ", jobs);
        RecalculateLoad(load);
    }

    private IEnumerable<string> LoadJobs(ConsolidationLoad load)
    {
        return (load.JobNumbers ?? string.Empty)
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
    }

    private IEnumerable<string> RemainingJobNumbers(string? includeLoadNo = null)
    {
        var assigned = _loads
            .Where(load => includeLoadNo is null || !load.LoadNo.Equals(includeLoadNo, StringComparison.OrdinalIgnoreCase))
            .SelectMany(LoadJobs)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        return VisibleShipments()
            .Where(shipment => !assigned.Contains(shipment.JobNo))
            .Select(shipment => shipment.JobNo);
    }

    private void RecalculateLoad(ConsolidationLoad load)
    {
        var linkedShipments = LoadJobs(load)
            .Select(job => _shipments.FirstOrDefault(s => s.JobNo.Equals(job, StringComparison.OrdinalIgnoreCase)))
            .Where(s => s is not null)
            .Cast<Shipment>()
            .ToList();

        load.Pieces = linkedShipments.Sum(s => s.Pieces);
        load.ActualKg = linkedShipments.Sum(s => s.ActualKg);
        load.Cbm = linkedShipments.Sum(s => s.Cbm);
        load.ChargeableKg = linkedShipments.Sum(s => s.ChargeableKg);
    }

    private bool UserNeedsManifestApproval(ConsolidationLoad load)
    {
        return !IsAdmin() && load.ManifestStatus is "Pending Approval" or "Approved";
    }

    private void ApplyConsolidationValues(
        ConsolidationLoad load,
        string route,
        string transporter,
        string vehicleNo,
        string status,
        string tripDate,
        string jobNumbers)
    {
        load.Route = route;
        load.Transporter = transporter;
        load.VehicleNo = vehicleNo;
        load.Status = status;
        load.TripDate = tripDate;
        load.JobNumbers = jobNumbers;
        RecalculateLoad(load);
    }

    private AdminRequest SubmitManifestApprovalRequest(
        ConsolidationLoad load,
        string route,
        string transporter,
        string vehicleNo,
        string status,
        string tripDate,
        string jobNumbers,
        string details)
    {
        var requestNo = NextAvailableNumber("REQ");
        var request = new AdminRequest(
            requestNo,
            "Manifest Approval",
            load.LoadNo,
            _currentUser.UserName,
            "Pending",
            DateTime.Today.ToString("yyyy-MM-dd"),
            details,
            route,
            transporter,
            vehicleNo,
            tripDate,
            status,
            jobNumbers);

        _adminRequests.Add(request);
        load.ManifestStatus = "Pending Approval";
        load.LastManifestRequestNo = requestNo;
        AddHistory("Submitted manifest approval request", $"{load.LoadNo} - {requestNo}");
        return request;
    }

    private void ApproveAdminRequest(AdminRequest request)
    {
        if (request.RequestType.Equals("Manifest Approval", StringComparison.OrdinalIgnoreCase))
        {
            var load = _loads.FirstOrDefault(l => l.LoadNo.Equals(request.ReferenceNo, StringComparison.OrdinalIgnoreCase));
            if (load is not null)
            {
                ApplyConsolidationValues(
                    load,
                    request.ProposedRoute,
                    request.ProposedTransporter,
                    request.ProposedVehicleNo,
                    request.ProposedLoadStatus,
                    request.ProposedTripDate,
                    request.ProposedJobNumbers);
                load.ManifestStatus = "Approved";
                load.LastManifestRequestNo = request.RequestNo;
            }
        }

        request.Status = "Approved";
        AddHistory("Approved admin request", $"{request.RequestNo} - {request.ReferenceNo}");
    }

    private bool IsAdmin()
    {
        return _currentUser.Role.Equals("Admin", StringComparison.OrdinalIgnoreCase);
    }

    private void ShowAdminRequestNotificationIfNeeded()
    {
        if (_adminRequestNoticeShown || !IsAdmin())
        {
            return;
        }

        var pendingCount = _adminRequests.Count(request => request.Status == "Pending") +
            _unblockRequests.Count(request => request.Status == "Pending");
        if (pendingCount == 0)
        {
            return;
        }

        _adminRequestNoticeShown = true;
        MessageBox.Show(
            $"{pendingCount} pending request(s) need admin approval. Open User Management / Settings to approve or cancel.",
            "Admin notifications",
            MessageBoxButton.OK,
            MessageBoxImage.Information);
    }

    private IEnumerable<Shipment> ReportShipments()
    {
        return IsAdmin() || _currentUser.CanViewAllEntry ? _shipments : VisibleShipments();
    }

    private void ExportShipmentsCsv(IEnumerable<Shipment>? source = null)
    {
        var dialog = new SaveFileDialog
        {
            Title = "Export shipments for Excel",
            Filter = "CSV file|*.csv",
            FileName = $"apollo-shipments-{DateTime.Today:yyyyMMdd}.csv"
        };

        if (dialog.ShowDialog() != true)
        {
            return;
        }

        var lines = new List<string>
        {
            "JobNo,AirwayBillNo,TariffNo,Branch,Customer,Origin,Destination,Status,Pieces,ActualKg,CBM,ChargeableKg,Sell,BuyCost,Margin,POD,Invoice"
        };
        var rows = (source ?? ReportShipments()).ToList();
        lines.AddRange(rows.Select(s => string.Join(',',
            Csv(s.JobNo),
            Csv(s.AirwayBillNo),
            Csv(s.TariffNo),
            Csv(s.Branch),
            Csv(s.Customer),
            Csv(s.Origin),
            Csv(s.Destination),
            Csv(s.Status),
            s.Pieces,
            s.ActualKg,
            s.Cbm,
            s.ChargeableKg,
            s.Sell,
            s.BuyCost,
            s.Sell - s.BuyCost,
            Csv(s.PodStatus),
            Csv(s.InvoiceStatus))));

        File.WriteAllLines(dialog.FileName, lines);
        AddHistory("Exported Excel CSV report", $"{Path.GetFileName(dialog.FileName)} - {_currentUser.BranchAccess}");
        MessageBox.Show("Excel CSV report exported.", "Apollo Freight ERP");
    }

    private void ExportShipmentsPdf(IEnumerable<Shipment>? source = null)
    {
        var dialog = new SaveFileDialog
        {
            Title = "Generate shipments PDF",
            Filter = "PDF file|*.pdf",
            FileName = $"apollo-shipments-{DateTime.Today:yyyyMMdd}.pdf"
        };

        if (dialog.ShowDialog() != true)
        {
            return;
        }

        File.WriteAllText(dialog.FileName, BuildShipmentTablePdf((source ?? ReportShipments()).ToList()));
        AddHistory("Generated PDF report", $"{Path.GetFileName(dialog.FileName)} - {_currentUser.BranchAccess}");
        MessageBox.Show("PDF report generated.", "Apollo Freight ERP");
    }

    private static string Csv(object? value)
    {
        var text = Convert.ToString(value, CultureInfo.InvariantCulture) ?? "";
        return $"\"{text.Replace("\"", "\"\"")}\"";
    }

    private static string BuildShipmentTablePdf(IEnumerable<Shipment> shipments)
    {
        var lines = new List<string>
        {
            "APOLLO FREIGHT SOLUTIONS",
            "We Bring Continents closer...",
            $"Shipment Report - {DateTime.Now:yyyy-MM-dd HH:mm}",
            "",
            "+--------------+----------+----------------------+------------+------------+------------+-----+-----------+----------+",
            "| Job No       | Branch   | Customer             | Origin     | Dest       | Status     | Pcs | Sell      | Margin   |",
            "+--------------+----------+----------------------+------------+------------+------------+-----+-----------+----------+"
        };

        lines.AddRange(shipments.Select(s =>
            $"| {Fit(s.JobNo, 12)} | {Fit(s.Branch, 8)} | {Fit(s.Customer, 20)} | {Fit(s.Origin, 10)} | {Fit(s.Destination, 10)} | {Fit(s.Status, 10)} | {s.Pieces,3} | {s.Sell,9:N3} | {s.Sell - s.BuyCost,8:N3} |"));

        lines.Add("+--------------+----------+----------------------+------------+------------+------------+-----+-----------+----------+");
        lines.Add($"Total Revenue: {shipments.Sum(s => s.Sell):N3}");
        lines.Add($"Total Gross Profit: {shipments.Sum(s => s.Sell - s.BuyCost):N3}");

        return BuildSimplePdf(lines);
    }

    private static string Fit(string value, int length)
    {
        var text = value.Length > length ? value[..length] : value;
        return text.PadRight(length);
    }

    private static string BuildSimplePdf(IEnumerable<string> lines)
    {
        var escapedLines = lines.Select(line => $"({EscapePdf(line)}) Tj T*");
        var stream = "BT /F1 9 Tf 30 780 Td 12 TL " + string.Join(' ', escapedLines) + " ET";
        var objects = new List<string>
        {
            "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
            "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj",
            "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj",
            "4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Courier >> endobj",
            $"5 0 obj << /Length {stream.Length} >> stream\n{stream}\nendstream endobj"
        };

        var pdf = new StringWriter(CultureInfo.InvariantCulture);
        pdf.WriteLine("%PDF-1.4");
        var offsets = new List<int> { 0 };
        foreach (var obj in objects)
        {
            offsets.Add((int)pdf.GetStringBuilder().Length);
            pdf.WriteLine(obj);
        }

        var xref = pdf.GetStringBuilder().Length;
        pdf.WriteLine("xref");
        pdf.WriteLine($"0 {objects.Count + 1}");
        pdf.WriteLine("0000000000 65535 f ");
        foreach (var offset in offsets.Skip(1))
        {
            pdf.WriteLine($"{offset:0000000000} 00000 n ");
        }
        pdf.WriteLine("trailer");
        pdf.WriteLine($"<< /Size {objects.Count + 1} /Root 1 0 R >>");
        pdf.WriteLine("startxref");
        pdf.WriteLine(xref);
        pdf.WriteLine("%%EOF");
        return pdf.ToString();
    }

    private static string EscapePdf(string value)
    {
        return value.Replace("\\", "\\\\").Replace("(", "\\(").Replace(")", "\\)");
    }

    private void OpenStatusEmail(Shipment shipment, string note)
    {
        var customer = _customers.FirstOrDefault(c => c.Name.Equals(shipment.Customer, StringComparison.OrdinalIgnoreCase));
        var to = customer?.Email ?? string.Empty;
        var subject = Uri.EscapeDataString($"Shipment status update - {shipment.JobNo}");
        var body = Uri.EscapeDataString(
            $"Dear {shipment.Customer},\r\n\r\n" +
            $"Please find the latest shipment update below:\r\n\r\n" +
            $"Job No: {shipment.JobNo}\r\n" +
            $"Status: {shipment.Status}\r\n" +
            $"Origin: {shipment.Origin}\r\n" +
            $"Destination: {shipment.Destination}\r\n" +
            $"Transit Time: {shipment.TransitDays} days\r\n" +
            $"POD Status: {shipment.PodStatus}\r\n" +
            $"Note: {note}\r\n\r\n" +
            "Regards,\r\nApollo Freight Solutions");

        var mailto = $"mailto:{to}?subject={subject}&body={body}";
        Process.Start(new ProcessStartInfo(mailto) { UseShellExecute = true });
        AddHistory("Generated customer status email", shipment.JobNo);
    }

    private void CreateShipment_Click(object sender, RoutedEventArgs e)
    {
        NavigationList.SelectedItem = "Shipments / Jobs";
    }

    private void Logout_Click(object sender, RoutedEventArgs e)
    {
        if (ValidateAllUniqueNumbers(out var message))
        {
            AppData.SaveAll();
        }
        else
        {
            MessageBox.Show($"{message}\n\nCorrect the duplicate entry before logout to save all changes.", "Duplicate entry", MessageBoxButton.OK, MessageBoxImage.Warning);
            return;
        }

        AppData.CurrentUser = null;
        var login = new LoginWindow();
        login.Show();
        Close();
    }

    protected override void OnClosing(System.ComponentModel.CancelEventArgs e)
    {
        if (ValidateAllUniqueNumbers(out var message))
        {
            AppData.SaveAll();
        }
        else
        {
            MessageBox.Show($"{message}\n\nThe duplicate change was not saved. Reopen the app and correct the number if needed.", "Duplicate entry", MessageBoxButton.OK, MessageBoxImage.Warning);
        }

        base.OnClosing(e);
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

public class Shipment(string jobNo, string branch, string customer, string origin, string destination, string status, int pieces, decimal actualKg, double cbm, decimal chargeableKg, decimal sell, decimal buyCost, string podStatus, string invoiceStatus, int transitDays, string bookingDate = "", string airwayBillNo = "", string tariffNo = "", string createdBy = "admin", string shipmentDirection = "Export", string shipmentService = "Consolidation", string shipmentServiceOther = "")
{
    public string JobNo { get; set; } = jobNo;
    public string BookingDate { get; set; } = string.IsNullOrWhiteSpace(bookingDate) ? DateTime.Today.ToString("yyyy-MM-dd") : bookingDate;
    public string AirwayBillNo { get; set; } = string.IsNullOrWhiteSpace(airwayBillNo) ? $"AWB-{DateTime.Today:yyMM}{Math.Abs(jobNo.GetHashCode()) % 10000:0000}" : airwayBillNo;
    public string TariffNo { get; set; } = tariffNo;
    public string CreatedBy { get; set; } = string.IsNullOrWhiteSpace(createdBy) ? "admin" : createdBy;
    public string ShipmentDirection { get; set; } = shipmentDirection;
    public string ShipmentService { get; set; } = shipmentService;
    public string ShipmentServiceOther { get; set; } = shipmentServiceOther;
    public string Branch { get; set; } = branch;
    public string Customer { get; set; } = customer;
    public string Origin { get; set; } = origin;
    public string Destination { get; set; } = destination;
    public string Status { get; set; } = status;
    public int Pieces { get; set; } = pieces;
    public decimal ActualKg { get; set; } = actualKg;
    public double Cbm { get; set; } = cbm;
    public decimal ChargeableKg { get; set; } = chargeableKg;
    public decimal Sell { get; set; } = sell;
    public decimal BuyCost { get; set; } = buyCost;
    public string PodStatus { get; set; } = podStatus;
    public string InvoiceStatus { get; set; } = invoiceStatus;
    public int TransitDays { get; set; } = transitDays;
    public int CurrentTransitDays => MainWindow.ParseDate(BookingDate, out var bookingDate)
        ? Math.Max(0, (DateTime.Today.Date - bookingDate.Date).Days)
        : 0;
}

public class ConsolidationLoad(string loadNo, string route, string transporter, string vehicleNo, string status, int pieces, decimal actualKg, double cbm, decimal chargeableKg, string jobNumbers = "", string tripDate = "", string manifestStatus = "Not Generated", string lastManifestRequestNo = "")
{
    public string LoadNo { get; set; } = loadNo;
    public string JobNumbers { get; set; } = jobNumbers;
    public string TripDate { get; set; } = string.IsNullOrWhiteSpace(tripDate) ? DateTime.Today.ToString("yyyy-MM-dd") : tripDate;
    public string Route { get; set; } = route;
    public string Transporter { get; set; } = transporter;
    public string VehicleNo { get; set; } = vehicleNo;
    public string Status { get; set; } = status;
    public int Pieces { get; set; } = pieces;
    public decimal ActualKg { get; set; } = actualKg;
    public double Cbm { get; set; } = cbm;
    public decimal ChargeableKg { get; set; } = chargeableKg;
    public string ManifestStatus { get; set; } = string.IsNullOrWhiteSpace(manifestStatus) ? "Not Generated" : manifestStatus;
    public string LastManifestRequestNo { get; set; } = lastManifestRequestNo;
}

public class Party(string code, string name, string locationOrLane, string email, string terms, string status, bool isAccountOverdue, string branch, string createdDate = "")
{
    public string Code { get; set; } = code;
    public string Name { get; set; } = name;
    public string LocationOrLane { get; set; } = locationOrLane;
    public string Email { get; set; } = email;
    public string Terms { get; set; } = terms;
    public string Status { get; set; } = status;
    public bool IsAccountOverdue { get; set; } = isAccountOverdue;
    public string Branch { get; set; } = branch;
    public string CreatedDate { get; set; } = string.IsNullOrWhiteSpace(createdDate) ? DateTime.Today.ToString("yyyy-MM-dd") : createdDate;
}

public class Tariff(string tariffNo, string customer, string origin, string destination, string mainSection, string weightSection, string rateType, decimal rate, decimal minCharge, int volumetricDivisor, string effectiveFrom, string effectiveTo, string createdBy = "admin")
{
    public string TariffNo { get; set; } = tariffNo;
    public string Customer { get; set; } = customer;
    public string Origin { get; set; } = origin;
    public string Destination { get; set; } = destination;
    public string MainSection { get; set; } = mainSection;
    public string WeightSection { get; set; } = weightSection;
    public string RateType { get; set; } = rateType;
    public decimal Rate { get; set; } = rate;
    public decimal MinCharge { get; set; } = minCharge;
    public int VolumetricDivisor { get; set; } = volumetricDivisor;
    public string EffectiveFrom { get; set; } = effectiveFrom;
    public string EffectiveTo { get; set; } = effectiveTo;
    public string CreatedBy { get; set; } = createdBy;
}

public class DocumentItem(string documentNo, string linkedNo, string type, string status, string date, string owner)
{
    public string DocumentNo { get; set; } = documentNo;
    public string LinkedNo { get; set; } = linkedNo;
    public string Type { get; set; } = type;
    public string Status { get; set; } = status;
    public string Date { get; set; } = date;
    public string Owner { get; set; } = owner;
}

public class Invoice(string invoiceNo, string customer, string shipmentNo, decimal revenue, decimal supplierCost, string status, string date, string createdBy = "admin")
{
    public string InvoiceNo { get; set; } = invoiceNo;
    public string Customer { get; set; } = customer;
    public string ShipmentNo { get; set; } = shipmentNo;
    public decimal Revenue { get; set; } = revenue;
    public decimal SupplierCost { get; set; } = supplierCost;
    public string Status { get; set; } = status;
    public string Date { get; set; } = date;
    public string CreatedBy { get; set; } = createdBy;
}

public class AuditEntry(string dateTime, string user, string action, string reference)
{
    public string DateTime { get; set; } = dateTime;
    public string User { get; set; } = user;
    public string Action { get; set; } = action;
    public string Reference { get; set; } = reference;
}

public class UserAccount(string userName, string email, string role, string accountStatus, string branchAccess, string password, bool canViewAllEntry, bool canViewOnlySelfEntry, bool canEditAllEntry, bool canViewUpdatedHistory, string notes, string createdDate = "")
{
    public string UserName { get; set; } = userName;
    public string Email { get; set; } = email;
    public string Role { get; set; } = role;
    public string AccountStatus { get; set; } = accountStatus;
    public string BranchAccess { get; set; } = branchAccess;
    public string Password { get; set; } = password;
    public bool CanViewAllEntry { get; set; } = canViewAllEntry;
    public bool CanViewOnlySelfEntry { get; set; } = canViewOnlySelfEntry;
    public bool CanEditAllEntry { get; set; } = canEditAllEntry;
    public bool CanViewUpdatedHistory { get; set; } = canViewUpdatedHistory;
    public string Notes { get; set; } = notes;
    public string CreatedDate { get; set; } = string.IsNullOrWhiteSpace(createdDate) ? DateTime.Today.ToString("yyyy-MM-dd") : createdDate;
}

public class UnblockRequest(string requestNo, string customerName, string requestedBy, string reason, string status, string date)
{
    public string RequestNo { get; set; } = requestNo;
    public string CustomerName { get; set; } = customerName;
    public string RequestedBy { get; set; } = requestedBy;
    public string Reason { get; set; } = reason;
    public string Status { get; set; } = status;
    public string Date { get; set; } = date;
}

public class AdminRequest(string requestNo, string requestType, string referenceNo, string requestedBy, string status, string date, string details, string proposedRoute = "", string proposedTransporter = "", string proposedVehicleNo = "", string proposedTripDate = "", string proposedLoadStatus = "", string proposedJobNumbers = "")
{
    public string RequestNo { get; set; } = requestNo;
    public string RequestType { get; set; } = requestType;
    public string ReferenceNo { get; set; } = referenceNo;
    public string RequestedBy { get; set; } = requestedBy;
    public string Status { get; set; } = status;
    public string Date { get; set; } = date;
    public string Details { get; set; } = details;
    public string ProposedRoute { get; set; } = proposedRoute;
    public string ProposedTransporter { get; set; } = proposedTransporter;
    public string ProposedVehicleNo { get; set; } = proposedVehicleNo;
    public string ProposedTripDate { get; set; } = proposedTripDate;
    public string ProposedLoadStatus { get; set; } = proposedLoadStatus;
    public string ProposedJobNumbers { get; set; } = proposedJobNumbers;
}

public class CustomerDeposit(string depositNo, string customerName, string date, decimal originalAmount, decimal paidAmount, string purpose, decimal balance, string branch)
{
    public string DepositNo { get; set; } = depositNo;
    public string CustomerName { get; set; } = customerName;
    public string Date { get; set; } = date;
    public decimal OriginalAmount { get; set; } = originalAmount;
    public decimal PaidAmount { get; set; } = paidAmount;
    public string Purpose { get; set; } = purpose;
    public decimal Balance { get; set; } = balance;
    public string Branch { get; set; } = branch;
}
