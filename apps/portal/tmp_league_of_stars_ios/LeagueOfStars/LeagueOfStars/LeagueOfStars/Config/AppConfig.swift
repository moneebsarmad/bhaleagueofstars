import Foundation

enum AppConfig {
    // Google OAuth Client ID
    static let googleClientID = "526878710756-hqkb1pvk80k249hkqsb6m53i875aeefq.apps.googleusercontent.com"

    // Google Sheet ID (from your spreadsheet URL)
    static let googleSheetID = "10ik6hTAhM4KO853BEG3eodzmqHxuqS2W_DAMAqqUEgA"

    // Sheet names (tabs in your spreadsheet)
    enum SheetNames {
        static let students = "Students"
        static let staff = "Staff"
        static let houseLeadership = "HouseLeadership"
        static let categories = "3R_Categories"
        static let meritLog = "Merit_Log"
    }

    // MARK: - Supabase Configuration
    enum Supabase {
        static let projectURL = "https://bvohvpwptmibveegccgf.supabase.co"
        static let anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2b2h2cHdwdG1pYnZlZWdjY2dmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5ODIzNjQsImV4cCI6MjA4MTU1ODM2NH0.koryN5xQ-PQdOXf1yerxooNBYYRfHU7SztShWP4e0r0"

        // Table names (case-sensitive, with spaces)
        enum Tables {
            static let staff = "staff"
            static let admin = "admins"
            static let meritLog = "merit_log"
            static let students = "students"
            static let meritCategories = "3r_categories"
            static let houseStandingsView = "house_standings_view"

            // Student tables by grade
            static let studentGrades = [
                "Grade 6",
                "Grade 7",
                "Grade 8",
                "Grade 9",
                "Grade 10",
                "Grade 11",
                "Grade 12"
            ]
        }
    }
}
