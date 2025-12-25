import Foundation
import GoogleSignIn

// MARK: - Google Sheets Service

class GoogleSheetsService: ObservableObject {
    static let shared = GoogleSheetsService()

    @Published var isLoading = false
    @Published var error: String?

    private let baseURL = "https://sheets.googleapis.com/v4/spreadsheets"
    private let sheetID = AppConfig.googleSheetID

    // MARK: - Debug: Get Sheet Info

    func getSheetInfo() async throws {
        guard let accessToken = GIDSignIn.sharedInstance.currentUser?.accessToken.tokenString else {
            throw GoogleSheetsError.notAuthenticated
        }

        // Fetch spreadsheet metadata to see all sheet names
        let urlString = "\(baseURL)/\(sheetID)?fields=sheets.properties"
        print("DEBUG: Fetching sheet metadata: \(urlString)")

        guard let url = URL(string: urlString) else { return }

        var request = URLRequest(url: url)
        request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")

        let (data, _) = try await URLSession.shared.data(for: request)

        if let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
           let sheets = json["sheets"] as? [[String: Any]] {
            print("DEBUG: ===== SHEETS IN SPREADSHEET =====")
            for sheet in sheets {
                if let props = sheet["properties"] as? [String: Any],
                   let title = props["title"] as? String,
                   let gridProps = props["gridProperties"] as? [String: Any],
                   let rowCount = gridProps["rowCount"] as? Int {
                    print("DEBUG: Sheet '\(title)' has \(rowCount) rows")
                }
            }
            print("DEBUG: ==================================")
        }
    }

    // MARK: - Fetch Students

    func fetchStudents() async throws -> [Student] {
        // First, get sheet info for debugging
        try? await getSheetInfo()

        // Use explicit row count to avoid API stopping at blank rows
        let range = "\(AppConfig.SheetNames.students)!A2:E1000"
        let data = try await fetchSheetData(range: range)

        print("DEBUG: Raw data rows from sheet: \(data.count)")
        print("DEBUG: Range requested: \(range)")

        var skippedRows = 0
        var unmatchedHouses: [String] = []

        let students = data.compactMap { row -> Student? in
            // Need at least student name
            guard row.count >= 1, !row[0].isEmpty else {
                skippedRows += 1
                return nil
            }

            let name = row[0].trimmingCharacters(in: .whitespaces)
            let grade = row.count > 1 ? row[1].trimmingCharacters(in: .whitespaces) : ""
            let section = row.count > 2 ? row[2].trimmingCharacters(in: .whitespaces) : ""
            let houseName = row.count > 3 ? row[3].trimmingCharacters(in: .whitespaces) : ""
            let gender = row.count > 4 ? row[4].trimmingCharacters(in: .whitespaces) : ""

            // Try to match house, but don't skip if no match
            let house = houseFromString(houseName)
            if house == nil && !houseName.isEmpty {
                if !unmatchedHouses.contains(houseName) {
                    unmatchedHouses.append(houseName)
                }
            }

            return Student(
                id: UUID().uuidString,
                name: name,
                grade: grade,
                section: section,
                house: house ?? .abuBakr,  // Default to first house if no match
                gender: gender
            )
        }

        print("DEBUG: Skipped \(skippedRows) empty rows")
        if !unmatchedHouses.isEmpty {
            print("DEBUG: Unmatched house names: \(unmatchedHouses)")
        }

        // Debug: Show all unique grades found
        let uniqueGrades = Set(students.map { $0.grade })
        print("DEBUG: ===== GRADES IN DATA =====")
        print("DEBUG: Unique grades: \(uniqueGrades.sorted())")
        print("DEBUG: First 10 student grades: \(students.prefix(10).map { "Grade='\($0.grade)' Section='\($0.section)'" })")
        print("DEBUG: =============================")

        return students
    }

    // MARK: - Fetch Staff

    func fetchStaff() async throws -> [(name: String, house: House?, email: String, role: String)] {
        let range = "\(AppConfig.SheetNames.staff)!A2:D"
        let data = try await fetchSheetData(range: range)

        return data.compactMap { row -> (name: String, house: House?, email: String, role: String)? in
            guard row.count >= 4 else { return nil }

            let name = row[0]
            let houseName = row[1]
            let email = row[2]
            let role = row[3]

            let house = houseFromString(houseName)

            return (name: name, house: house, email: email, role: role)
        }
    }

    // MARK: - Fetch Merit Log

    func fetchMeritLog() async throws -> [MeritEntry] {
        let range = "\(AppConfig.SheetNames.meritLog)!A2:K"
        let data = try await fetchSheetData(range: range)

        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "M/d/yyyy"

        return data.compactMap { row -> MeritEntry? in
            guard row.count >= 11 else { return nil }

            let timestampStr = row[0]
            let dateStr = row[1]
            let staffName = row[2]
            let studentName = row[3]
            let grade = row[4]
            let section = row[5]
            let houseName = row[6]
            let r = row[7]
            let subcategory = row[8]
            let pointsStr = row[9]
            let notes = row.count > 10 ? row[10] : ""

            guard let house = houseFromString(houseName),
                  let points = Int(pointsStr) else { return nil }

            let date = dateFormatter.date(from: dateStr) ?? Date()

            return MeritEntry(
                id: UUID().uuidString,
                timestamp: Date(),
                dateOfEvent: date,
                staffName: staffName,
                studentName: studentName,
                grade: grade,
                section: section,
                house: house,
                r: r,
                subcategory: subcategory,
                points: points,
                notes: notes
            )
        }
    }

    // MARK: - Add Merit Entry

    func addMeritEntry(
        staffName: String,
        student: Student,
        r: String,
        subcategory: String,
        points: Int,
        notes: String
    ) async throws {
        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "M/d/yyyy"

        let timestampFormatter = DateFormatter()
        timestampFormatter.dateFormat = "M/d/yyyy HH:mm:ss"

        let now = Date()
        let values: [[String]] = [[
            timestampFormatter.string(from: now),
            dateFormatter.string(from: now),
            staffName,
            student.name,
            student.grade,
            student.section,
            student.house.rawValue,
            r,
            subcategory,
            String(points),
            notes
        ]]

        try await appendToSheet(range: "\(AppConfig.SheetNames.meritLog)!A:K", values: values)
    }

    // MARK: - Private Helpers

    private func fetchSheetData(range: String) async throws -> [[String]] {
        guard let accessToken = GIDSignIn.sharedInstance.currentUser?.accessToken.tokenString else {
            throw GoogleSheetsError.notAuthenticated
        }

        let encodedRange = range.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? range
        let urlString = "\(baseURL)/\(sheetID)/values/\(encodedRange)"

        print("DEBUG: Fetching URL: \(urlString)")

        guard let url = URL(string: urlString) else {
            throw GoogleSheetsError.invalidURL
        }

        var request = URLRequest(url: url)
        request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw GoogleSheetsError.invalidResponse
        }

        print("DEBUG: HTTP Status: \(httpResponse.statusCode)")

        if httpResponse.statusCode == 401 {
            throw GoogleSheetsError.notAuthenticated
        }

        guard httpResponse.statusCode == 200 else {
            throw GoogleSheetsError.httpError(httpResponse.statusCode)
        }

        // Debug: Print raw response
        if let responseString = String(data: data, encoding: .utf8) {
            print("DEBUG: Response range: \(responseString.prefix(200))...")
        }

        let decoded = try JSONDecoder().decode(SheetResponse.self, from: data)
        print("DEBUG: Decoded range: \(decoded.range ?? "nil")")
        return decoded.values ?? []
    }

    private func appendToSheet(range: String, values: [[String]]) async throws {
        guard let accessToken = GIDSignIn.sharedInstance.currentUser?.accessToken.tokenString else {
            throw GoogleSheetsError.notAuthenticated
        }

        let encodedRange = range.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? range
        let urlString = "\(baseURL)/\(sheetID)/values/\(encodedRange):append?valueInputOption=USER_ENTERED"

        guard let url = URL(string: urlString) else {
            throw GoogleSheetsError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let body = ["values": values]
        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (_, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse,
              httpResponse.statusCode == 200 else {
            throw GoogleSheetsError.writeFailed
        }
    }

    private func houseFromString(_ string: String) -> House? {
        // Normalize string: lowercase and remove special characters
        let normalized = string.lowercased()
            .folding(options: .diacriticInsensitive, locale: .current)
            .replacingOccurrences(of: "'", with: "")
            .replacingOccurrences(of: "'", with: "")
            .replacingOccurrences(of: "ʿ", with: "")
            .replacingOccurrences(of: "ʾ", with: "")

        if normalized.contains("abu bakr") || normalized.contains("abu") && normalized.contains("bakr") {
            return .abuBakr
        } else if normalized.contains("khadijah") || normalized.contains("khadija") {
            return .khadijah
        } else if normalized.contains("umar") || normalized.contains("omar") {
            return .umar
        } else if normalized.contains("aishah") || normalized.contains("aisha") || normalized.contains("ayesha") {
            return .aishah
        }
        return nil
    }
}

// MARK: - Response Models

struct SheetResponse: Codable {
    let range: String?
    let majorDimension: String?
    let values: [[String]]?
}

// MARK: - Errors

enum GoogleSheetsError: LocalizedError {
    case notAuthenticated
    case invalidURL
    case invalidResponse
    case httpError(Int)
    case writeFailed

    var errorDescription: String? {
        switch self {
        case .notAuthenticated:
            return "Please sign in with Google to access the spreadsheet"
        case .invalidURL:
            return "Invalid URL"
        case .invalidResponse:
            return "Invalid response from server"
        case .httpError(let code):
            return "Server error: \(code)"
        case .writeFailed:
            return "Failed to write to spreadsheet"
        }
    }
}
