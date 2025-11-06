// src/dictionaries/de.ts (Vollständig & Korrigiert)

export const dictionary = {
  navigation: {
    home: 'Startseite',
    products: 'Produkte',
    about: 'Über uns',
    contact: 'Kontakt',
    menu: 'Menü',
    partnerPortal: 'Partnerportal',
    search: 'Suche',
  },
  notifications: {
        title: "Benachrichtigungen",
        markAllAsRead: "Alle als gelesen markieren",
        noNewNotifications: "Keine neuen Benachrichtigungen.",
        errorLoading: "Fehler beim Laden.",
        viewDetails: "Details ansehen", // Fallback-Linktext
    },
  ueberUnsPage: {
    // --- Hero Section ---
    title: 'Unsere Geschichte & Werte', // Zuvor kullanılan
    heroSubtitle: 'HANDWERKSKUNST AUS TRADITION', // Zuvor düzeltilen

    // --- Mission Section ---
    missionTitle: 'Unsere Mission', // YENİ EKLENDİ
    missionP1: 'Unsere Mission ist es, die Premium-Patisserie-Kultur in Deutschland zugänglich zu machen. Wir bieten unseren Partnern nicht nur Produkte, sondern ein komplettes Erlebnis, das auf Qualität, Zuverlässigkeit und Exklusivität basiert.', // YENİ EKLENDİ

    // --- Story Section ---
    storyTitle: 'Von der Manufaktur zum Marktführer', // YENİ EKLENDİ
    storyP1: 'ElysonSweets wurde 2010 als kleine Manufaktur in Berlin gegründet, angetrieben von der Leidenschaft, traditionelle Rezepte mit moderner Ästhetik zu verbinden. Jedes Rezept wurde über Generationen perfektioniert.', // YENİ EKLENDİ
    storyP2: 'Heute sind wir stolz darauf, ein wachsendes Netzwerk von Geschäftspartnern in ganz Deutschland zu beliefern und unsere kompromisslose Verpflichtung zur Qualität beizubehalten, während wir expandieren.', // YENİ EKLENDİ

    // --- Image Alts (Resim Açıklamaları) ---
    image1Alt: 'ElysonSweets Konditor bei der Handarbeit an einer Torte.', // YENİ EKLENDİ
    image2Alt: 'Historische Aufnahme der ersten ElysonSweets Manufaktur-Küche.', // YENİ EKLENDİ

    // --- Zuvor Düzeltilmiş Diğer Anahtarlar ---
    section1Title: 'Das Herz von ElysonSweets',
    section1Text: 'Wir wählen nur die feinsten Zutaten und garantieren meisterhafte Handwerkskunst in jeder Kreation. Qualität ist kein Versprechen, sondern unser Standard.',
  },

  loginPage: {
    title: "ElysonSweets", // KORRIGIERT: Name geändert
    subtitle: "Willkommen im Admin-Panel",
    emailLabel: "E-Mail-Adresse",
    passwordLabel: "Passwort",
    errorTitle: "Anmeldung fehlgeschlagen",
    submitButton: "Anmelden",
    submittingButton: "Anmeldung läuft...",
    forgotPasswordLink: "Passwort vergessen?",
    emailPlaceholder: "admin@example.com",
    passwordPlaceholder: "••••••••",
    unauthorizedError: 'Sie sind nicht berechtigt, auf diese Seite zuzugreifen.',
    rememberMe: 'Angemeldet bleiben',
  },

  portal: {
    productDetailPage: {
        sampleRequest: "Muster anfragen",
        sampleRequested: "Muster angefragt",
        // --- NEUE TEXTE ---
        yourPrice: "Ihr Preis (Netto)",
        availability: "Verfügbarkeit",
        availabilityInStock: "Auf Lager",
        availabilityLowStock: "Wenig Bestand",
        availabilityOutOfStock: "Ausverkauft",
        
        // ------------------
    },
    catalogPage: { // <--- UND DIESER SCHLÜSSEL MUSS HIER DRIN SEIN
        title: "Produktkatalog",
        description: "Durchstöbern Sie unser komplettes Produktsortiment.",
        searchPlaceholder: "Produkt nach Name oder Code suchen...",
        allCategories: "Alle Kategorien",
        noProductsFoundFilter: "Keine Produkte für die aktuellen Filter gefunden.",
        noProductsFound: "Derzeit sind keine Produkte im Katalog verfügbar.",
        toggleFavoriteAdd: "Zu Favoriten hinzufügen",
        toggleFavoriteRemove: "Von Favoriten entfernen",
        viewDetails: "Details ansehen",
        backToList: "Zurück zum Katalog",
    },
    newOrderPage: {
      title: 'Neue Bestellung erstellen',
      subtitle: 'Stellen Sie Ihren Warenkorb aus dem Katalog zusammen.',
      searchPlaceholder: 'Nach Produktname oder -code suchen...',
      favoritesButton: 'Meine Favoriten',
      stockStatus: {
        inStock: 'Auf Lager',
        lowStock: 'Wenig Lagerbestand',
        outOfStock: 'Ausverkauft',
        addToCart: "In den Warenkorb", // Button-Text
        addedToCart: "sepete eklendi!", // Toast-Nachricht (oder "zum Warenkorb hinzugefügt!")
        stockNotAvailable: "Stok yetersiz! Maksimum %{stock} adet.", // Warnung
        productOutOfStock: "Dieses Produkt ist ausverkauft.",
      },
      noProductsFound: 'Keine Produkte für diese Kriterien gefunden.',
      cartTitle: 'Ihr Warenkorb',
      cartEmpty: 'Ihr Warenkorb ist leer.',
      cartTotal: 'Gesamt:',
      cartDiscountApplied: 'Ihr persönlicher Rabatt von %{discount}% wurde angewendet.',
      confirmOrderButton: 'Bestellung bestätigen',
      processingOrder: 'Bestellung wird bearbeitet...',
      error: {
        stockNotAvailable: 'Nicht genügend Lagerbestand! Maximal %{stock} Einheiten verfügbar.',
        productOutOfStock: 'Dieses Produkt ist ausverkauft.',
        cartEmpty: 'Bitte fügen Sie Produkte zum Warenkorb hinzu, um eine Bestellung aufzugeben.',
      },
    },
    ordersPage: {
      title: 'Meine Bestellungen',
      subtitle: 'Verfolgen Sie hier alle Ihre vergangenen und aktuellen Bestellungen.',
      newOrderButton: 'Neue Bestellung',
      loadError: 'Beim Laden Ihrer Bestellungen ist ein Fehler aufgetreten.',
      noOrders: 'Sie haben noch keine Bestellungen aufgegeben.',
      noOrdersForFilter: 'Für Ihre Filterkriterien wurden keine Bestellungen gefunden.',
      orderId: 'Bestell-ID',
      orderDate: 'Datum',
      totalAmount: 'Gesamtbetrag',
      status: 'Status',
      searchPlaceholder: 'Nach Bestell-ID suchen...',
      filterByStatus: 'Nach Status filtern',
      allStatuses: 'Alle Status',
      page: 'Seite',
      of: 'von',
      previous: 'Zurück',
      next: 'Weiter',
    },
    orderDetailsPage: {
      backToList: 'Zurück zur Bestellliste',
      title: 'Bestellung',
      creationDate: 'Erstellt am',
      orderItems: 'Bestellpositionen',
      product: 'Produkt',
      quantity: 'Menge',
      unitPrice: 'Stückpreis',
      lineTotal: 'Gesamt',
      subtotal: 'Zwischensumme',
      vat: 'MwSt.',
      grandTotal: 'Gesamtsumme',
      customerInfo: 'Kundeninformation',
      deliveryInfo: 'Lieferinformation',
    },
    requestsPage: {
        title: "Meine Anfragen",
        description: "Verfolgen Sie Ihre Musteranfragen und reichen Sie neue Produktideen ein.",
        // Tab 1: Musteranfragen
        tabSampleRequests: "Musteranfragen",
        requestDate: "Anfragedatum",
        rejectionReason: "Ablehnungsgrund",
        noSampleRequests: "Sie haben noch keine Muster angefragt.",
        sampleStatuses: {
            "Yeni Talep": "Neue Anfrage",
            "Onaylandı": "Bestätigt",
            "Hazırlanıyor": "In Vorbereitung",
            "Gönderildi": "Versendet",
            "İptal Edildi": "Abgelehnt"
        },
        // Tab 2: Neue Produktanfrage
        tabNewProduct: "Neue Produktanfrage",
        // Aktionen
        cancelButton: "Stornieren",
        editButton: "Bearbeiten",
        deleteButton: "Löschen",
        // Bestätigungen
        cancelConfirm: "Möchten Sie diese Anfrage wirklich stornieren?",
        deleteConfirm: "Möchten Sie diese Produktanfrage wirklich löschen?",
        // Status-Feedback
        requestCancelled: "Anfrage storniert",
        requestDeleted: "Anfrage gelöscht",
        errorOccurred: "Ein Fehler ist aufgetreten",
        editProduct: { // Eigener Abschnitt für die Bearbeiten-Seite
            title: "Produktanfrage bearbeiten",
            description: "Aktualisieren Sie die Details Ihrer Anfrage.",
            submitting: "Wird gespeichert...",
            submitButton: "Änderungen speichern"
        },
        newProduct: { // Korrekt verschachtelt
            newProductIntro: "Haben Sie eine Produktidee oder vermissen Sie einen bestimmten Artikel in unserem Sortiment? Teilen Sie es uns mit!",
            newProductName: "Produktname",
            newProductCategory: "Kategorievorschlag",
            newProductDescription: "Beschreibung",
            newProductEstimate: "Geschätzte Abnahme (pro Woche)",
            newProductLink: "Referenzlink (Bild oder Webseite)",
            submitButton: "Anfrage senden",
            submitting: "Wird gesendet...",
            formTitle: "Neue Produktanfrage einreichen", // Titel für das Formular
            submittedRequests: "Ihre eingereichten Anfragen", // Titel für die Liste
            noSubmittedRequests: "Sie haben noch keine Produktanfragen eingereicht.",
            adminNote: "Antwort von uns:",
            productStatuses: { // Status-Texte für Produktanfragen
                "Yeni": "Neu",
                "Değerlendiriliyor": "Wird geprüft",
                "Onaylandı": "Akzeptiert",
                "Reddedildi": "Abgelehnt"
            }
        }
    },
    sidebar: {
      title: "Partner-Portal",
      dashboard: "Dashboard",
      orders: "Meine Bestellungen",
      products: "Produktkatalog",
      requests: "Meine Anfragen",
      performance: "Meine Performance",
      materials: "Materialien",
    },
    header: {
      titleSuffix: "Portal",
      logout: "Abmelden",
      cartTitle: "Warenkorb",
    },
    dashboard: {
      // ++ NEUE TEXTE FÜR SCHNELLBESTELLUNG ++
            quickOrderTitle: "Schnellbestellung", // Titel des Widgets
            searchProductPlaceholder: "Produktname oder Code suchen...", // Platzhalter für Suchfeld
            addSelectedToCart: "Auswahl zum Warenkorb hinzufügen", // Button-Text (ohne Zahl)
            addNItemsToCart: "{count} Artikel zum Warenkorb hinzufügen", // Button-Text (mit Zahl)
            noProductsFound: "Keine Produkte für Ihre Suche gefunden.", // Meldung, wenn Suche leer ist
            pleaseSelectItems: "Bitte Artikel auswählen.", // Fehlermeldung, wenn keine Menge > 0
            stockWarning: "Nicht genügend Lagerbestand! Max. {stock} verfügbar.", // Warnung bei Mengeneingabe
            itemRemoved: "Artikel aus Auswahl entfernt.", // Toast-Nachricht (optional)
            addingToCart: "Wird hinzugefügt...", // Text für Button während des Ladens
      viewOpenOrders: "Offene Bestellungen",
      myFavorites: "Meine Favoriten",
      openSampleRequests: "Offene Musteranfragen",
      viewFavorites: "Favoriten ansehen", // Text für den Link/Button
      viewRequests: "Anfragen ansehen",
      orderDetails: "Details ansehen",
      welcome: "Willkommen, ",
      subtitle: "Hier ist eine Übersicht Ihrer letzten Aktivitäten.",
      newOrderButton: "Neue Bestellung aufgeben",
      announcementsTitle: "Ankündigungen",
      announcementsPlaceholder: "Zukünftige Ankündigungen und Aktionen werden hier angezeigt.",
      recentOrdersTitle: "Letzte Bestellungen",
      noOrders: "Sie haben noch keine Bestellungen aufgegeben.",
      ordersPlaceholder: "Bestellliste wird hier angezeigt.",
      pendingBalance: "Offener Saldo",
      openOrders: "Offene Bestellungen",
      newOrderButtonValue: "Jetzt einkaufen",
      materialsWidget: { // Korrekt verschachtelt
        title: "Neueste Materialien",
        viewAll: "Alle ansehen",
        noMaterials: "Keine neuen Materialien.",
      },
    },
    materialsPage: {
        title: "Marketingmaterialien",
        description: "Hier finden Sie nützliche Materialien wie Broschüren, Preislisten und Bilder.",
        noMaterials: "Aktuell sind keine Marketingmaterialien verfügbar.",
        download: "Herunterladen",
    },
  }, // <-- Ende 'portal' Objekt
  invoices: {
    status: {
      pending: 'Ausstehend',
      paid: 'Bezahlt',
      overdue: 'Überfällig',
      cancelled: 'Storniert'
    },
  },
  pnlReportPage: {
    pageTitle: "Gewinn & Verlust Bericht",
    pageSubtitle: "Die finanzielle Gesundheit deines Unternehmens auf einen Blick.",
    filterLabel: "Zeitraum wählen:",
    periodThisMonth: "Dieser Monat",
    periodLastMonth: "Letzter Monat",
    periodThisYear: "Dieses Jahr",
    totalRevenue: "Gesamteinnahmen",
    totalCogs: "Kosten der verkauften Waren (SMM)",
    grossProfit: "Bruttogewinn",
    opExHeader: "Betriebsausgaben",
    totalOpEx: "Gesamte Betriebsausgaben",
    netProfit: "Nettogewinn",
    netLoss: "Nettoverlust",
    errorLoading: "Bericht konnte nicht geladen werden.",
    accessDenied: "Zugriff verweigert"
  },
  adminSidebar: {
    title: "Admin-Panel",
    mainMenu: "Hauptmenü",
    crm: "CRM & Kundenverwaltung",
    management: "Verwaltung",
    operations: "Betrieb",
    productManagement: "Produktverwaltung",
    pricing: "Preisgestaltung",
    marketing: "Marketing",
    finances: "Finanzen",
    settings: "Einstellungen",
    dashboard: "Dashboard",
    customers: "Kunden",
    applications: "Anwendungen",
    tasks: "Aufgaben",
    products: "Produkte",
    categories: "Kategorien",
    orders: "Bestellungen",
    templates: "Vorlagen",
    announcements: "Ankündigungen",
    marketingMaterials: "Marketingmaterial",
    sampleRequests: "Musteranfragen",
    productRequests: "Produktanfragen",
    reviews: "Bewertungen",
    expenses: "Ausgaben",
    reporting: "Berichterstattung",
    // Preisgestaltung Untermenüs
    priceCalculation: "Preisberechnung",
    priceRequests: "Preisanfragen",
    priceExceptions: "Preisausnahmen",
    priceRules: "Preisregeln",
    // Einstellungen Untermenüs
    systemSettings: "Systemeinstellungen",
    profile: "Profil",
    customerProfiles: "Kundenprofile",
    profileAssignments: "Profilzuweisungen",
  },

  // KORREKTUR: adminHeader auf die oberste Ebene verschoben
  adminHeader: {
    logout: "Abmelden",
  },

  adminDashboard: {
    noOverdueTasks: "Aktuell keine überfälligen Aufgaben.", // Für die leere Liste
        dueDate: "Fällig am:", // Präfix für das Datum
        viewAllTasks: "Alle Aufgaben anzeigen", // Link-Text
    cardNewApplications: "Neue Partneranträge",
        cardOpenSampleRequests: "Offene Musteranfragen",
        cardNewProductRequests: "Neue Produktanfragen", // Nur wenn Tabelle existiert
        viewApplications: "Anträge prüfen",
        viewSampleRequests: "Muster prüfen",
        viewProductRequests: "Anfragen prüfen",
        actionNewProduct: "Neues Produkt", // Für Schnellaktion
    // KORREKTUR: productRequestsPage korrekt hier platziert
    productRequestsPage: {
        title: "Neue Produktanfragen",
        description: "Von Partnern eingereichte Produktideen.",
        noRequests: "Keine Produktanfragen gefunden.",
        noRequestsFilter: "Keine Anfragen für diese Filter gefunden.",
        statusOptions: {
            "Yeni": "Neu",
            "Değerlendiriliyor": "Wird geprüft",
            "Onaylandı": "Akzeptiert",
            "Reddedildi": "Abgelehnt"
        }
    },
    // KORREKTUR: sampleRequestsPage korrekt hier platziert
    sampleRequestsPage: {
      title: "Musteranfragen",
      description: "Anfragen aufgelistet.",
      noRequests: "Keine Anfragen gefunden.",
      noRequestsFilter: "Keine Anfragen für Filter gefunden.",
      statuses: {
          "Yeni Talep": "Neue Anfrage",
          "Onaylandı": "Bestätigt",
          "Hazırlanıyor": "In Vorbereitung",
          "Gönderildi": "Versendet",
          "İptal Edildi": "Abgelehnt",
      },
      statusOptions: { // KORREKTUR: statusOptions ist jetzt parallel zu statuses
          "Yeni Talep": "Neue Anfrage",
          "Onaylandı": "Bestätigt",
          "Hazırlanıyor": "In Vorbereitung",
          "Gönderildi": "Versendet",
          "İptal Edildi": "Abgelehnt"
      }
    },
    
    // Bestehende adminDashboard Einträge
    title: 'Admin Dashboard',
    sidebar: {
      dashboard: "Übersicht",
      applications: 'Partneranträge',
      products: 'Produktverwaltung',
      orders: 'Bestellungen',
      partners: 'Partner',
      // KORREKTUR: Falsch verschachteltes sampleRequestsPage-Objekt von hier entfernt
    },
    crmPage: {
      title: 'Kundenverwaltung (CRM)',
      companiesFound: 'Firmen gefunden.',
      newCompany: 'Neue Firma',
      noCompaniesTitle: 'Noch keine Firmen erfasst',
      noCompaniesDesc: 'Fügen Sie eine neue Firma hinzu, um zu beginnen.',
      noCompaniesFilterTitle: 'Keine Firmen für Filter gefunden',
      noCompaniesFilterDesc: 'Versuchen Sie, Ihre Suchkriterien zu ändern.',
      searchPlaceholder: 'Nach Firmenname suchen...',
      allStatusesLabel: 'Alle Status',
      detailSubtitle: 'Firmendetails & Verwaltung',
      tabs: {
        generalInfo: 'Allgemeine Informationen',
        activities: 'Aktivitäten',
        contacts: 'Kontakte',
        orders: 'Bestellungen',
        tasks: 'Aufgaben',
      },
      companyName: 'Firma',
      category: 'Kategorie',
      phone: 'Telefon',
      responsible: 'Verantwortlich',
      status: 'Status',
      noPhone: 'Kein Telefon',
      notAssigned: 'Nicht zugewiesen',
      unknown: 'Unbekannt',
      responsiblePerson: 'Verantwortlich: ',
      statusOptions: {
        'Potansiyel': 'Potenzial',
        'İlk Temas': 'Erstkontakt',
        'Numune Sunuldu': 'Muster eingereicht',
        'Teklif Verildi': 'Angebot abgegeben',
        'Anlaşma Sağlandı': 'Vereinbarung erreicht',
        'Pasif': 'Inaktiv',
      },
    },
    partnersPage: {
      title: 'Partnerverwaltung',
      companyName: 'Unternehmen',
      contactPerson: 'Ansprechpartner',
      email: 'E-Mail',
      totalOrders: 'Bestellungen gesamt',
      totalRevenue: 'Umsatz gesamt',
      status: 'Status',
    },
    applicationsPage: {
      title: 'Neue Partneranträge',
      company: 'Unternehmen',
      contact: 'Ansprechpartner',
      email: 'E-Mail',
      status: 'Status',
      date: 'Datum',
      actions: 'Aktionen',
      approve: 'Genehmigen',
      reject: 'Ablehnen',
      approving: 'Wird genehmigt...',
      rejecting: 'Wird abgelehnt...',
      approved: 'Genehmigt',
      noApplications: 'Aktuell keine neuen Anträge.',
    },
    productsPage: {
      title: 'Produktverwaltung',
      addProduct: 'Neues Produkt hinzufügen',
      productName: 'Produktname',
      category: 'Kategorie',
      price: 'Preis',
      stock: 'Lagerbestand',
      actions: 'Aktionen',
      edit: 'Bearbeiten',
      delete: 'Löschen',
      modalTitle: 'Neues Produkt erstellen',
      modalTitleEdit: 'Produkt bearbeiten',
      imageUrl: 'Bild-URL',
      save: 'Speichern',
      cancel: 'Abbrechen',
      deleteConfirmation: "'{productName}' ürününü silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.",
      deleting: 'Wird gelöscht...',
      imageUpload: 'Bild hochladen',
      imagePreview: 'Bild Vorschau',
      noImage: 'Kein Bild',
    },
    ordersPage: {
      title: 'Alle Bestellungen',
      orderId: 'Bestell-ID',
      date: 'Datum',
      customer: 'Kunde (User ID)',
      total: 'Gesamtbetrag',
      status: 'Status',
      actions: 'Aktionen',
      viewDetails: 'Details ansehen',
      updateStatus: 'Status aktualisieren',
      reorderButton: "Erneut bestellen",
      cancelButton: "Bestellung stornieren",
      cancellingButton: "Wird storniert...",
statusOptions: {
                "Beklemede": "Ausstehend", // oder "Neu" / "Wartend"
                "Hazırlanıyor": "In Bearbeitung",
                "Yola Çıktı": "Versandt",
                "Teslim Edildi": "Zugestellt",
                "İptal Edildi": "Storniert"
            },
      orderDetailModal: {
        title: 'Bestelldetails',
        products: 'Produkte',
        quantity: 'Menge',
        price: 'Preis',
        subtotal: 'Zwischensumme',
        shippingAddress: 'Lieferadresse',
      },
    },
    dashboardPage: {
      managerTitle: "CEO Cockpit",
      managerSubtitle: "Willkommen zur Live-Übersicht deines Unternehmens.",
      teamMemberTitle: "Mein Persönliches Panel",
      teamMemberSubtitle: "Hier ist, worauf du dich heute konzentrieren solltest.",
      cardRevenueThisMonth: "Umsatz (Dieser Monat)",
      cardNetProfitThisMonth: "Nettogewinn (Dieser Monat)",
      cardActiveOrders: "Aktive Bestellungen",
      cardCriticalStock: "Kritischer Lagerbestand",
      agendaTitle: "Agenda & Dringende Aufgaben",
      overdueTasks: "überfällige Aufgaben gefunden.",
      quickActionsTitle: "Schnellaktionen",
      actionNewOrder: "Neue Bestellung",
      actionNewCompany: "Neue Firma",
      actionNewExpense: "Neue Ausgabe",
      cardOpenTasks: "Mir zugewiesene offene Aufgaben",
      cardNewOrdersFromClients: "Neue Bestellungen von meinen Kunden",
      quickAccessTitle: "Schnellzugriff",
      linkMyClients: "Meine Kunden",
      linkMyTasks: "Meine Aufgaben",
      errorLoadingTeamDashboard: "Dein persönliches Panel konnte nicht geladen werden.",
    },
    // KPI und operationelle Texte
    kpiRevenueMtd: 'Umsatz MTD (Netto)',
    kpiGrossMargin: 'Bruttomarge',
    kpiAov: 'Durchschnittlicher Bestellwert',
    kpiOrdersToday: 'Bestellungen heute',
    kpiOverdueInvoices: 'Überfällige Rechnungen',
    orderBreakdownTitle: 'Bestellstatus Verteilung (30 Tage)',
  },
  search: {
    placeholder: 'Suchen Sie nach Produkten, Rezepten und mehr...',
    close: 'Schließen',
    modalPlaceholder: 'Wonach suchen Sie?',
    searchButton: 'Suchen',
  },
  topBar: {
    announcement: 'Premium-Qualität, zugänglich gemacht.',
  },
  dashboard: {
    managerTitle: "CEO Cockpit",
    managerSubtitle: "Willkommen zur Live-Übersicht deines Unternehmens.",
    teamMemberTitle: "Mein Persönliches Panel",
    teamMemberSubtitle: "Hier ist, worauf du dich heute konzentrieren solltest.",
    cardRevenueThisMonth: "Umsatz (Dieser Monat)",
    cardNetProfitThisMonth: "Nettogewinn (Dieser Monat)",
    cardActiveOrders: "Aktive Bestellungen",
    cardCriticalStock: "Kritischer Lagerbestand",
    agendaTitle: "Agenda & Dringende Aufgaben",
    overdueTasks: "überfällige Aufgaben gefunden.",
    quickActionsTitle: "Schnellaktionen",
    actionNewOrder: "Neue Bestellung",
    actionNewCompany: "Neue Firma",
    actionNewExpense: "Neue Ausgabe",
    cardOpenTasks: "Mir zugewiesene offene Aufgaben",
    cardNewOrdersFromClients: "Neue Bestellungen von meinen Kunden",
    quickAccessTitle: "Schnellzugriff",
    linkMyClients: "Meine Kunden",
    linkMyTasks: "Meine Aufgaben",
    errorLoadingTeamDashboard: "Dein persönliches Panel konnte nicht geladen werden.",
    actionNewProduct: "Neues Produkt",
    actionNewTask: "Neue Aufgabe",
    viewAllTasks: "Alle Aufgaben anzeigen",
    noOverdueTasks: "Aktuell keine überfälligen Aufgaben.",
    dueDate: "Fällig am:",
    viewCriticalStockLink: "Kritische Artikel ansehen",
    financialOverview: "Finanzübersicht (Dieser Monat)",
    loadingFinancialData: "Finanzdaten werden geladen...",
    viewOrdersText: "Bestellungen anzeigen",
    viewActiveOrders: "Offene Bestellungen ansehen",
  },
  marketingKit: {
    title: 'Ihr Marketing- & Menü-Kit',
    description: 'Nutzen Sie unsere professionellen Materialien, um ElysonSweets-Produkte in Ihrem Geschäft zu bewerben.', // KORRIGIERT: Name geändert
    assets: [{
      name: 'Produktfotos (Hohe Auflösung)',
      type: 'Bilder',
      action: 'Herunterladen'
    }, {
      name: 'Menüvorlagen (PDF)',
      type: 'Dokumente',
      action: 'Herunterladen'
    }, {
      name: 'Social Media Posts (Vorlage)',
      type: 'Vorlagen',
      action: 'Herunterladen'
    }, ]
  },
  portalLoginPage: {
    title: 'Willkommen zurück, Partner.',
    subtitle: 'Bitte melden Sie sich an, um auf Ihr exklusives Dashboard zuzugreifen.',
    emailLabel: 'E-Mail-Adresse',
    passwordLabel: 'Passwort',
    loginButton: 'Anmelden',
    forgotPassword: 'Passwort vergessen?',
    registerPrompt: 'Noch kein Partner?',
    registerLink: 'Jetzt registrieren.',
    welcomeTitle: 'Exklusiver Zugang für unsere Geschäftspartner',
    welcomeText: 'Profitieren Sie von exklusiven Preisen, Marketingmaterialien und einem engagierten Support-Team, das Ihnen zum Erfolg verhilft.',
  },
  registerPage: {
    title: 'Werden Sie ElysonSweets-Partner',
    subtitle: 'Füllen Sie das Antragsformular aus und werden Sie Teil unseres exklusiven Netzwerks.',
    companyName: 'Name des Unternehmens',
    contactPerson: 'Ansprechpartner',
    email: 'E-Mail-Adresse',
    phone: 'Telefonnummer (Optional)',
    address: 'Adresse (Optional)',
    vatId: 'Umsatzsteuer-ID (Optional)',
    message: 'Ihre Nachricht an uns (Optional)',
    submitButton: 'Antrag Senden',
    submitting: 'Wird gesendet...',
    successTitle: 'Vielen Dank!',
    successMessage: 'Ihr Antrag wurde erfolgreich übermittelt. Wir werden ihn prüfen und uns in Kürze bei Ihnen melden.',
    backToLogin: 'Zurück zum Login',
  },
  newOrderPage: {
    title: 'Neue Bestellung aufgeben',
    searchPlaceholder: 'Produkt suchen...',
    product: 'Produkt',
    price: 'Preis',
    quantity: 'Menge',
    subtotal: 'Zwischensumme',
    addToCart: 'Hinzufügen',
    orderSummary: 'Bestellübersicht',
    total: 'Gesamtbetrag',
    placeOrder: 'Bestellung aufgeben',
    noItems: 'Noch keine Artikel im Warenkorb.',
    stock: 'Lagerbestand:',
  },
  megaMenu: {
    promo: {
      title: 'Produkt des Monats',
      description: 'Entdecken Sie unseren neuen Pistazien-Himbeer-Traum.',
      button: 'Jetzt ansehen',
      href: '/produkte/torten-kuchen/pistazie-himbeer',
      imageAlt: 'Ein köstliches Stück Pistazien-Himbeer-Torte',
      imageUrl: 'https://images.unsplash.com/photo-1565958011703-4f9829ba187?q=80&w=1965&auto=format&fit=crop'
    },
    mainCategories: [{
      name: 'Patisserie',
      promoImage: 'https://images.unsplash.com/photo-1627834392233-5a0242416f1c?q=80&w=1974&auto=format&fit=crop',
      subCategories: [{
        name: 'Torten & Kuchen',
        href: '/produkte/torten-kuchen',
        description: '125 Sorten'
      }, {
        name: 'Vegane Produkte',
        href: '/produkte/vegan',
        description: '19 Sorten'
      }, {
        name: 'Kurabiye & Gebäck',
        href: '/produkte/kurabiye',
        description: '17 Sorten'
      }, ]
    }, {
      name: 'Kaffee & Getränke',
      promoImage: 'https://images.unsplash.com/photo-1511920183353-3c2c5d7d5d99?q=80&w=1974&auto=format&fit=crop',
      subCategories: [{
        name: 'Kaffee',
        href: '/produkte/kaffee',
        description: '35 Sorten'
      }, {
        name: 'Tee & Pulvergetränke',
        href: '/produkte/tee',
        description: '35 Sorten'
      }, {
        name: 'Erfrischungsgetränke',
        href: '/produkte/getraenke',
        description: '20 Sorten'
      }, ]
    }, {
      name: 'Zutaten & Sirupe',
      promoImage: 'https://images.unsplash.com/photo-1621263765183-59b43fac3388?q=80&w=1974&auto=format&fit=crop',
      subCategories: [{
        name: 'Kaffeesirupe',
        href: '/produkte/sirupe',
        description: '44 Sorten'
      }, ]
    }, {
      name: 'Herzhaftes',
      promoImage: 'https://images.unsplash.com/photo-1594007654729-407eedc4be65?q=80&w=1928&auto=format&fit=crop',
      subCategories: [{
        name: 'Gourmet Pizza',
        href: '/produkte/pizza',
        description: ''
      }, ]
    }, ]
  },
  philosophy: {
    title: 'Unsere Philosophie',
    paragraph1: 'Bei ElysonSweets glauben wir, dass wahrer Luxus in der kompromisslosen Qualität der Zutaten und der leidenschaftlichen Handwerkskunst unserer Meisterkonditoren liegt.',
    paragraph2: 'Jede Kreation ist ein Versprechen – ein unvergessliches Geschmackserlebnis, das aus Tradition geboren und für den modernen Gaumen perfektioniert wurde.',
    imageAlt: 'ElysonSweets tarafından özel olarak hazırlanmış, arka fonsuz bir pasta görseli',
  },
  categories: {
    title: 'Unsere Produktkategorien',
    subtitle: 'Entdecken Sie unsere exquisite Auswahl an handgefertigten Köstlichkeiten',
    cakes: 'Torten & Kuchen',
    desserts: 'Pralinen & Macarons',
    pastries: 'Feingebäck',
    cakes_alt: 'Ein Stück köstlicher Schokoladenkuchen',
    desserts_alt: 'Bunte Macarons',
    pastries_alt: 'Frisch gebackene Croissants',
  },
  testimonials: {
    title: 'Stimmen unserer Partner',
    review1: 'Die Qualität und Kreativität von ElysonSweets hat unser Café auf ein neues Level gehoben. Unsere Kunden lieben die Desserts!',
    name1: 'Anna Schmidt',
    company1: 'Inhaberin, Café Bellevue',
    review2: 'Zuverlässige Lieferung und konstant herausragende Produkte. ElysonSweets ist für unsere Events ein unverzichtbarer Partner geworden.',
    name2: 'Maximilian Huber',
    company2: 'Eventmanager, Huber & Co.',
    review3: 'Vom ersten Kontakt bis zur Lieferung – absolute Professionalität. Die Patisserie ist nicht nur lecker, sondern auch ein Kunstwerk.',
    name3: 'Sophia Weber',
    company3: 'Chefköchin, Restaurant "Zur Eiche"',
  },
  cta: {
    title: 'Bereit, Ihr Angebot zu veredeln?',
    subtitle: 'Werden Sie Teil unseres exklusiven Partnernetzwerks und erhalten Sie Zugang zu Premium-Produkten, die Ihre Kunden begeistern werden.',
    button: 'Jetzt Partner Werden',
  },
  socials: {
    instagram: 'Folgen Sie uns auf Instagram',
    facebook: 'Finden Sie uns auf Facebook',
    pinterest: 'Entdecken Sie uns auf Pinterest',
    twitter: 'Folgen Sie uns auf Twitter',
    tiktok: 'Folgen Sie uns auf TikTok',
    linkedin: 'Vernetzen Sie sich mit uns auf LinkedIn',
    youtube: 'Abonnieren Sie unseren YouTube-Kanal',
    followUs: 'Folgen Sie uns',
  },
  hero: {
    title: 'Handwerkskunst, die ',
    highlight: 'Ihre Gäste verzaubert.',
    subtitle: 'Erlesene Patisserie-Kreationen, die Luxus neu definieren – zugänglich für Ihr Unternehmen.',
    button: 'Partner Werden',
  },
  footer: {
    legal: 'Rechtliches',
    impressum: 'Impressum',
    datenschutz: 'Datenschutz',
    copyright: '© 2025 ElysonSweets Germany. Alle Rechte vorbehalten.',
  },
  logoAlt: 'ElysonSweets Logo',
  productDetailPage: {
    description: 'Beschreibung',
    ingredients: 'Zutaten',
    allergens: 'Allergene',
    addToCart: 'Zum Warenkorb hinzufügen',
    tabDescription: 'Beschreibung',
    tabDetails: 'Produktdetails',
    tabHandling: 'Lagerung & Handhabung',
    sliceCount: 'Stückzahl',
    weight: 'Gewicht',
    portionSize: 'Portionsgröße',
    storageConditions: 'Lagerbedingungen',
    storageDuration: 'Lagerdauer',
    thawingTime: 'Auftauzeit',
    shelfLife: 'Haltbarkeit (aufgetaut)',
    sampleProduct: {
      id: 1, name: 'Fıstık Rüyası', category: 'Torten & Kuchen', price: '45,00 €',
      mainImage: 'https://...87',
      gallery: [ 'https://...400', 'https://...400', 'https://...400' ],
      descriptionText: 'Kakaobiskuit, Mousse von Zartbitterschokolade, Ganache von weißer Schokolade, dragierte Pistazien...',
      ingredientsList: 'Dunkle Schokolade, Weizenmehl, Bio-Eier, Rohrzucker, frische Sahne, Butter, Pistazien.',
      allergensList: 'Kann Spuren von Nüssen enthalten. Enthält Gluten, Eier und Milchprodukte.',
      technicalDetails: { sliceCount: '12 Stück', weight: '1540 g ± 5 g', portionSize: '128 g ± 5 g', },
      storageInfo: { conditions: 'bei -18 °C', duration: '12 Monate', thawingTime: '3-3,5 Stunden bei +4 °C', shelfLife: '3-4 Tage bei +4 °C', }
    }
  },
  productsPage: {
    title: 'Unsere Kollektionen',
    filterTitle: 'Kategorien filtern',
    allProducts: 'Alle Produkte',
    sampleProducts: [
        { id: 1, name: 'Klassische Schokoladentorte', category: 'Torten & Kuchen', imageUrl: 'https://...87', alt: 'Ein Stück Schokoladenkuchen' },
        { id: 2, name: 'Französische Macarons', category: 'Pralinen & Macarons', imageUrl: 'https://...9e', alt: 'Bunte Macarons' },
        { id: 3, name: 'Frische Croissants', category: 'Feingebäck', imageUrl: 'https://...cd', alt: 'Frisch gebackene Croissants' },
        { id: 4, name: 'Äthiopischer Yirgacheffe', category: 'Kaffee & Tee', imageUrl: 'https://...f3', alt: 'Eine Tasse Kaffee' },
        { id: 5, name: 'Vegane Himbeertorte', category: 'Vegane Produkte', imageUrl: 'https://...2a', alt: 'Ein Stück veganer Himbeerkuchen' },
        { id: 6, name: 'Gourmet Salami Pizza', category: 'Gourmet Pizza', imageUrl: 'https://...91', alt: 'Eine Gourmet-Salami-Pizza' },
    ],
    detailsButton: 'Details ansehen',
  },
  pagination: {
    page: 'Seite',
    of: 'von',
    next: 'Nächste',
    previous: 'Vorherige',
  },
  qualityPromise: {
    title: 'Unser Qualitätsversprechen',
    item1: { title: 'Beste Zutaten', description: 'Wir wählen nur die feinsten und frischesten Rohstoffe von vertrauenswürdigen Lieferanten aus.', },
    item2: { title: 'Geprüfte Markenqualität', description: 'Als Distributor beziehen wir ausschließlich von zertifizierten Herstellern – mit konstanter Serienqualität, lückenloser Rückverfolgbarkeit und verlässlichen Produktspezifikationen.', },
    item3: { title: 'Zuverlässige Lieferung', description: 'Wir garantieren eine pünktliche und sorgfältige Lieferung, damit Ihre Ware stets in perfektem Zustand ankommt.', },
  },
  certifications: {
    title: 'Zertifizierungen & Standards',
    brc: {
      label: 'BRC-zertifiziert',
      description: 'Zertifizierte Lebensmittelsicherheit nach BRC Global Standard.'
    },
    halal: {
      label: 'Halal-zertifiziert',
      description: 'Produkte mit offiziell bestätigter Halal-Konformität.'
    }
  },
  datenschutzPage: {
    title: 'Datenschutzerklärung',
    lastUpdated: 'Stand: 01. Oktober 2025',
    p1: 'Wir nehmen den Schutz Ihrer persönlichen Daten sehr ernst. Wir behandeln Ihre personenbezogenen Daten vertraulich und entsprechend der gesetzlichen Datenschutzvorschriften sowie dieser Datenschutzerklärung.',
    p2: 'Die Nutzung unserer Webseite ist in der Regel ohne Angabe personenbezogener Daten möglich. Soweit auf unseren Seiten personenbezogene Daten (beispielsweise Name, Anschrift oder E-Mail-Adressen) erhoben werden, erfolgt dies, soweit möglich, stets auf freiwilliger Basis.',
    sectionTitle1: '1. Verantwortliche Stelle',
    responsibleBody: 'Verantwortliche Stelle im Sinne der Datenschutzgesetze, insbesondere der EU-Datenschutzgrundverordnung (DSGVO), ist:',
    companyDetails: [ 'ElysonSweets GmbH', 'Musterstraße 123', '12345 Berlin', 'E-Mail: info@ElysonSweets.de', ],
    sectionTitle2: '2. Ihre Betroffenenrechte',
    rightsIntro: 'Unter den angegebenen Kontaktdaten unseres Datenschutzbeauftragten können Sie jederzeit folgende Rechte ausüben:',
    rightsList: [ 'Auskunft über Ihre bei uns gespeicherten Daten und deren Verarbeitung,', 'Berichtigung unrichtiger personenbezogener Daten,', 'Löschung Ihrer bei uns gespeicherten Daten,', 'Einschränkung der Datenverarbeitung, sofern wir Ihre Daten aufgrund gesetzlicher Pflichten noch nicht löschen dürfen,', 'Widerspruch gegen die Verarbeitung Ihrer Daten bei uns und', 'Datenübertragbarkeit, sofern Sie in die Datenverarbeitung eingewilligt haben oder einen Vertrag mit uns abgeschlossen haben.', ],
    p3: 'Sofern Sie uns eine Einwilligung erteilt haben, können Sie diese jederzeit mit Wirkung für die Zukunft widerrufen.'
  },
  impressumPage: {
    title: 'Impressum',
    section1Title: 'Angaben gemäß § 5 TMG',
    address: [ 'ElysonSweets GmbH', 'Musterstraße 123', '12345 Berlin', 'Deutschland', ],
    section2Title: 'Vertreten durch',
    managingDirector: 'Turgay Celen',
    section3Title: 'Kontakt',
    phone: 'Telefon: +49 (0) 123 456 789',
    email: 'E-Mail: info@ElysonSweets.de',
    section4Title: 'Registereintrag',
    registerCourt: 'Amtsgericht Charlottenburg',
    registerNumber: 'HRB 123456 B',
    section5Title: 'Umsatzsteuer-ID',
    vatId: 'DE123456789',
    section6Title: 'Haftungsausschluss',
    disclaimerText: 'Trotz sorgfältiger inhaltlicher Kontrolle übernehmen wir keine Haftung für die Inhalte externer Links. Für den Inhalt der verlinkten Seiten sind ausschließlich deren Betreiber verantwortlich.',
  },
  contactPage: {
    title: 'Kontakt aufnehmen',
    heroSubtitle: 'WIR FREUEN UNS, VON IHNEN ZU HÖREN',
    formTitle: 'Senden Sie uns eine Nachricht',
    formName: 'Ihr Name',
    formEmail: 'Ihre E-Mail-Adresse',
    formMessage: 'Ihre Nachricht',
    formButton: 'Nachricht Senden',
    detailsTitle: 'Direkter Kontakt',
    address: 'Musterstraße 123, 12345 Berlin, Deutschland',
    phone: '+49 (0) 123 456 789',
    email: 'info@ElysonSweets.de',
  },
  orderStatuses: {
    processing: 'In Vorbereitung',
    shipped: 'Versandt',
    delivered: 'Zugestellt',
    cancelled: 'Storniert',
  },
  adminPartners: {
    title: "Partner-Verwaltung",
    partnerId: "Partner-ID",
    companyName: "Firma",
    contactPerson: "Ansprechpartner",
    status: "Vertriebsstatus",
    createdAt: "Erstellt am",
    viewApplicationsButton: "Neue Partner erstellen",
    noPartners: "Es sind keine aktiven Partner vorhanden.",
    deleteConfirmation: "Möchten Sie diesen Partner wirklich löschen?",
    createPartnerButton: "Neuen Partner erstellen",
  },
}; // <-- DIESE KLAMMER IST DIE LETZTE.