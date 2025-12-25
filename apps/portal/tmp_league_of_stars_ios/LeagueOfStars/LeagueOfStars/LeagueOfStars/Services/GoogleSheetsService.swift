import Foundation
import GoogleSignIn

// MARK: - Google Sheets Service

class GoogleSheetsService: ObservableObject {
    static let shared = GoogleSheetsService()

    @Published var isLoading = false
    @Published var error: String?

    private let baseURL = "https://sheets.googleapis.com/v4/spreadsheets"
    private let sheetID = AppConfig.googleSheetID

    // MARK: - Fetch Students

    func fetchStudents() async throws -> [Student] {
        // Use explicit row count to avoid API stopping at blank rows
        // Columns: A=Name, B=Grade, C=Section, D=House, E=Gender, F=Password, G=ParentCode
        let range = "\(AppConfig.SheetNames.students)!A2:G1000"
        let data = try await fetchSheetData(range: range)

        print("DEBUG: Raw data rows from sheet: \(data.count)")

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
            let password = row.count > 5 ? row[5].trimmingCharacters(in: .whitespaces) : ""
            let parentCode = row.count > 6 ? row[6].trimmingCharacters(in: .whitespaces) : ""

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
                gender: gender,
                password: password,
                parentCode: parentCode
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
        let range = "\(AppConfig.SheetNames.meritLog)!A2:K5000"
        let data = try await fetchSheetData(range: range)

        print("DEBUG: ===== MERIT LOG =====")
        print("DEBUG: Raw merit log rows: \(data.count)")

        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "M/d/yyyy"

        var skippedRows = 0
        var parsedEntries = 0

        let entries = data.compactMap { row -> MeritEntry? in
            // Need at least student name and points (columns 4 and 10)
            guard row.count >= 10 else {
                skippedRows += 1
                return nil
            }

            // row[0] is timestamp - not currently used
            let dateStr = row[1].trimmingCharacters(in: .whitespaces)
            let staffName = row[2].trimmingCharacters(in: .whitespaces)
            let studentName = row[3].trimmingCharacters(in: .whitespaces)
            let grade = row[4].trimmingCharacters(in: .whitespaces)
            let section = row[5].trimmingCharacters(in: .whitespaces)
            let houseName = row[6].trimmingCharacters(in: .whitespaces)
            let r = row[7].trimmingCharacters(in: .whitespaces)
            let subcategory = row[8].trimmingCharacters(in: .whitespaces)
            let pointsStr = row[9].trimmingCharacters(in: .whitespaces)
            let notes = row.count > 10 ? row[10].trimmingCharacters(in: .whitespaces) : ""

            // Skip empty rows
            guard !studentName.isEmpty else {
                skippedRows += 1
                return nil
            }

            // Try to parse points - skip if not a valid number
            guard let points = Int(pointsStr) else {
                print("DEBUG: Skipping row - invalid points '\(pointsStr)' for student '\(studentName)'")
                skippedRows += 1
                return nil
            }

            // Try to match house, default if no match
            let house = houseFromString(houseName) ?? .abuBakr

            let date = dateFormatter.date(from: dateStr) ?? Date()

            parsedEntries += 1
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

        print("DEBUG: Parsed \(parsedEntries) merit entries, skipped \(skippedRows) rows")
        if let first = entries.first {
            print("DEBUG: Sample entry - Student: '\(first.studentName)', R: '\(first.r)', Points: \(first.points)")
        }

        // Debug: Check if Layla exists in data
        let laylaEntries = entries.filter { $0.studentName.lowercased().contains("layla") }
        print("DEBUG: Entries containing 'Layla': \(laylaEntries.count)")
        if let layla = laylaEntries.first {
            print("DEBUG: Layla entry found - Name: '\(layla.studentName)', Points: \(layla.points)")
        }
        print("DEBUG: =======================")

        return entries
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

        guard let url = URL(string: urlString) else {
            throw GoogleSheetsError.invalidURL
        }

        var request = URLRequest(url: url)
        request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw GoogleSheetsError.invalidResponse
        }

        if httpResponse.statusCode == 401 {
            throw GoogleSheetsError.notAuthenticated
        }

        guard httpResponse.statusCode == 200 else {
            throw GoogleSheetsError.httpError(httpResponse.statusCode)
        }

        let decoded = try JSONDecoder().decode(SheetResponse.self, from: data)
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
        let lowercased = string.lowercased()
        if lowercased.contains("abu bakr") || lowercased.contains("abū bakr") {
            return .abuBakr
        } else if lowercased.contains("khadijah") || lowercased.contains("khadījah") {
            return .khadijah
        } else if lowercased.contains("umar") || lowercased.contains("ʿumar") {
            return .umar
        } else if lowercased.contains("aishah") || lowercased.contains("ʿāʾishah") || lowercased.contains("aisha") {
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
