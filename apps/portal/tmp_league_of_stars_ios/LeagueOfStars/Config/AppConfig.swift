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
}
