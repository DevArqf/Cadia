// Legal content for Cadia — Terms of Service, FAQ, Privacy Policy

export interface LegalSection {
  heading?: string;
  paragraphs?: string[];
  list?: string[];
  link?: { label: string; url: string };
}

export interface LegalDoc {
  title: string;
  lastUpdated?: string;
  sections: LegalSection[];
}

export const TERMS_OF_SERVICE: LegalDoc = {
  title: "Terms of Service",
  sections: [
    {
      paragraphs: [
        "By using Cadia, inviting Cadia to a server, using the Cadia Dashboard, or using Cadia commands, you agree to these Terms.",
        "You must follow Discord's Terms of Service, Discord's Community Guidelines, Discord's Developer rules, these Terms, and the rules of any server where Cadia is used.",
      ],
    },
    {
      paragraphs: [
        "You may not use Cadia to spam, harass users, exploit bugs, abuse commands, bypass moderation, attack the service, scrape data, impersonate Cadia staff, run scams, distribute malware, or break any law or platform rule.",
      ],
    },
    {
      paragraphs: [
        "Cadia's RPG items, currency, gear, rewards, levels, rankings, and progress are virtual only. They have no real-world cash value. Cadia developers may reset, edit, remove, or rebalance RPG data when needed because of bugs, abuse, cheating, technical issues, or updates.",
      ],
    },
    {
      paragraphs: [
        "Server owners and admins are responsible for their server settings and how they use Cadia's moderation, logging, ticket, welcome, automod, and dashboard tools.",
      ],
    },
    {
      paragraphs: [
        "Cadia may block users, blacklist servers, remove access, delete data, reset progress, or disable features if Cadia is abused or used in a harmful way.",
      ],
    },
    {
      paragraphs: [
        "Cadia is provided \"as is.\" We do not guarantee that Cadia will always be online, error-free, secure, or available. Features may change, break, be limited, or be removed at any time.",
      ],
    },
    {
      paragraphs: [
        "Cadia developers are not responsible for lost data, server issues, moderation mistakes, downtime, Discord outages, third-party service problems, user actions, or damages caused by using Cadia.",
      ],
    },
    {
      paragraphs: [
        "You are responsible for anything you submit, configure, or create through Cadia, including command input, ticket content, server settings, and dashboard changes.",
      ],
    },
    {
      paragraphs: [
        "We may update these Terms at any time. Continued use of Cadia after changes means you accept the updated Terms.",
      ],
    },
    {
      paragraphs: [
        "For support, legal questions, or data requests, contact: business.malikjohn@gmail.com or join the Support Server.",
      ],
      link: { label: "Join Support Server", url: "https://discord.gg/26R7kXa6dx" },
    },
  ],
};

export const FAQ: LegalDoc = {
  title: "Frequently Asked Questions",
  sections: [
    {
      heading: "Is Cadia owned by Discord?",
      paragraphs: ["No. Cadia is an independent third-party Discord bot and is not owned or endorsed by Discord."],
    },
    {
      heading: "What data does Cadia store?",
      paragraphs: ["Cadia stores only the data needed for its features, such as Discord IDs, server settings, command usage, RPG progress, moderation records, ticket data, and dashboard settings."],
    },
    {
      heading: "Can I delete my data?",
      paragraphs: ["Yes. Contact Cadia support to request deletion. Some data may be kept temporarily for security, backups, abuse prevention, or legal reasons."],
      link: { label: "Contact Support", url: "https://discord.gg/26R7kXa6dx" },
    },
    {
      heading: "Are Cadia RPG items worth real money?",
      paragraphs: ["No. Cadia RPG items, currency, gear, rewards, ranks, and progress are virtual and have no real-world cash value."],
    },
    {
      heading: "Can Cadia ban or blacklist users or servers?",
      paragraphs: ["Yes. Cadia developers may restrict users or servers that abuse Cadia, exploit bugs, break rules, spam, or use Cadia in harmful ways."],
    },
    {
      heading: "Is Cadia guaranteed to stay online?",
      paragraphs: ["No. Cadia is provided as-is. We try to keep it stable, but downtime, bugs, resets, or feature changes can happen."],
    },
    {
      heading: "Who is responsible for server moderation settings?",
      paragraphs: ["The server owner and admins are responsible for how Cadia is configured and used in their server."],
    },
    {
      heading: "Where can I get support?",
      paragraphs: ["Contact Cadia support via the Support Server."],
      link: { label: "Join Support Server", url: "https://discord.gg/26R7kXa6dx" },
    },
  ],
};

export const PRIVACY_POLICY: LegalDoc = {
  title: "Privacy Policy of Cadia",
  lastUpdated: "June 23, 2026",
  sections: [
    {
      paragraphs: [
        "Cadia collects some Personal Data from its Users.",
        "This Privacy Policy explains what data Cadia collects, why it is collected, how it is used, and what rights Users have regarding their data.",
        "Cadia refers to the Cadia Discord bot, Cadia Dashboard, Cadia website, and any related Cadia services.",
        "Cadia is not affiliated with, endorsed by, or owned by Discord.",
      ],
    },
    {
      heading: "Owner and Data Controller",
      paragraphs: ["Cadia is operated by the Cadia development team."],
      link: { label: "Support Server", url: "https://discord.gg/26R7kXa6dx" },
    },
    {
      heading: "Types of Data Collected",
      paragraphs: ["Cadia may collect the following types of data:"],
      list: [
        "Discord user IDs",
        "Discord server IDs",
        "Discord channel IDs",
        "Discord role IDs",
        "Usernames and avatars",
        "Command usage data",
        "Server configuration data",
        "Dashboard configuration data",
        "RPG profile data",
        "Inventory, level, quest, currency, cooldown, and leaderboard data",
        "Moderation, blacklist, automod, logging, ticket, welcome, and utility data",
        "Technical data needed to operate, secure, and debug Cadia",
      ],
    },
    {
      heading: "How Data Is Collected",
      paragraphs: ["Data may be collected when a User:"],
      list: [
        "Uses Cadia commands",
        "Interacts with Cadia features",
        "Creates or updates RPG progress",
        "Uses the Cadia Dashboard",
        "Configures Cadia in a Discord server",
        "Triggers moderation, logging, ticket, welcome, automod, or utility systems",
        "Contacts Cadia support",
      ],
    },
    {
      heading: "Purpose of Processing",
      paragraphs: ["Cadia collects and processes data to:"],
      list: [
        "Provide Cadia's bot features",
        "Save RPG progress",
        "Manage server settings",
        "Run dashboard controls",
        "Provide moderation and safety tools",
        "Operate ticket, logging, welcome, automod, and utility systems",
        "Prevent abuse, spam, cheating, and misuse",
        "Debug errors and improve stability",
        "Protect Cadia, its Users, Discord servers, and the development team",
        "Comply with legal obligations or valid enforcement requests",
      ],
    },
    {
      heading: "Mode and Place of Processing",
      paragraphs: [
        "Cadia processes data using secure computers, databases, hosting services, and other technical tools.",
        "The Cadia development team takes reasonable security measures to prevent unauthorized access, disclosure, modification, or destruction of data.",
        "Data may be processed in countries different from the User's country, depending on where Cadia's hosting, database, or service providers are located.",
      ],
    },
    {
      heading: "Third-Party Services",
      paragraphs: [
        "Cadia may use third-party services to operate the bot, dashboard, website, database, analytics, monitoring, hosting, authentication, or infrastructure.",
        "These services may process limited data only when needed for Cadia to work.",
        "Cadia may also interact with Discord's API and services. Discord's own Terms of Service and Privacy Policy apply to Discord itself.",
      ],
    },
    {
      heading: "Retention Time",
      paragraphs: [
        "Cadia keeps data only for as long as needed for the purpose it was collected.",
        "RPG progress, server settings, moderation records, ticket data, logs, and dashboard settings may be stored for as long as needed to provide Cadia's services.",
        "Some data may be kept longer when required for security, abuse prevention, backups, legal obligations, dispute handling, or enforcement.",
        "When data is no longer needed, Cadia may delete, anonymize, or securely remove it.",
      ],
    },
    {
      heading: "Data Deletion Requests",
      paragraphs: [
        "Users may request deletion of their Personal Data by contacting Cadia support.",
        "Server owners or authorized administrators may request deletion of server configuration data.",
        "Some data may not be deleted immediately if it is needed for security, abuse prevention, backups, legal obligations, active disputes, or enforcement.",
        "Contact: business.malikjohn@gmail.com",
      ],
      link: { label: "Support Server", url: "https://discord.gg/26R7kXa6dx" },
    },
    {
      heading: "User Rights",
      paragraphs: ["Depending on applicable law, Users may have the right to:"],
      list: [
        "Request access to their data",
        "Request correction of inaccurate data",
        "Request deletion of their data",
        "Request restriction of processing",
        "Object to certain processing",
        "Withdraw consent where processing is based on consent",
        "Request a copy of their data where legally required",
        "File a complaint with a relevant data protection authority",
      ],
    },
    {
      heading: "Server Owner Responsibility",
      paragraphs: [
        "Server owners and administrators are responsible for how they configure Cadia in their servers.",
        "If a server enables logging, moderation, automod, tickets, welcome messages, or similar features, Cadia may process data related to those features.",
        "Server owners should inform their members when using features that log, moderate, or process server activity.",
      ],
    },
    {
      heading: "Children",
      paragraphs: [
        "Cadia is intended for Users who are allowed to use Discord under Discord's own Terms of Service and local laws.",
        "Users who are not old enough to use Discord should not use Cadia.",
      ],
    },
    {
      heading: "Security",
      paragraphs: [
        "Cadia uses reasonable measures to protect stored data.",
        "However, no online service can be guaranteed to be completely secure. Cadia and its developers are not responsible for unauthorized access caused by Discord issues, third-party service issues, compromised User accounts, server misconfiguration, or events outside Cadia's reasonable control.",
      ],
    },
    {
      heading: "Changes to This Privacy Policy",
      paragraphs: [
        "Cadia may update this Privacy Policy at any time.",
        "Changes may be made when Cadia adds new features, changes how data is handled, updates its services, or needs to comply with legal, platform, or security requirements.",
        "Continued use of Cadia after changes means the User accepts the updated Privacy Policy.",
      ],
    },
    {
      heading: "Contact",
      paragraphs: [
        "For privacy questions, data deletion requests, legal requests, or support, contact:",
        "business.malikjohn@gmail.com",
      ],
      link: { label: "Support Server", url: "https://discord.gg/26R7kXa6dx" },
    },
  ],
};
