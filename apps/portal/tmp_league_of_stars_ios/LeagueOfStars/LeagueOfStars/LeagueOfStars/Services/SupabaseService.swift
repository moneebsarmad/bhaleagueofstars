import Foundation

// MARK: - Supabase Service

class SupabaseService: ObservableObject {
    static let shared = SupabaseService()

    @Published var isLoading = false
    @Published var error: String?

    private let baseURL: String
    private let apiKey: String

    init() {
        self.baseURL = AppConfig.Supabase.projectURL
        self.apiKey = AppConfig.Supabase.anonKey
    }

    // MARK: - Fetch Students

    func fetchStudents() async throws -> [Student] {
        do {
            return try await fetchStudentsFromUnifiedTable()
        } catch {
            print("DEBUG: Unified students table fetch failed, falling back to grade tables: \(error)")
            return try await fetchStudentsFromGradeTables()
        }
    }

    private func fetchStudentsFromUnifiedTable() async throws -> [Student] {
        let endpoint = "/rest/v1/\(AppConfig.Supabase.Tables.students)?select=*"
        let data = try await performRequest(endpoint: endpoint, method: "GET")

        if let jsonString = String(data: data, encoding: .utf8) {
            print("DEBUG: Raw students JSON (sample): \(jsonString.prefix(500))")
        }

        let decoder = JSONDecoder()
        let studentDTOs = try decoder.decode([StudentRowDTO].self, from: data)

        let students = studentDTOs.map { dto in
            Student(
                id: dto.id ?? UUID().uuidString,
                name: dto.studentName ?? "",
                grade: dto.grade?.value ?? "",
                section: dto.section ?? "",
                house: self.houseFromString(dto.house ?? "") ?? .abuBakr,
                gender: dto.gender ?? "",
                password: dto.password ?? "",
                parentCode: dto.parentCode?.value ?? ""
            )
        }

        print("DEBUG: Fetched \(students.count) students from unified table")
        return students
    }

    private func fetchStudentsFromGradeTables() async throws -> [Student] {
        var allStudents: [Student] = []

        for gradeTable in AppConfig.Supabase.Tables.studentGrades {
            do {
                let encodedTable = gradeTable.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? gradeTable
                let endpoint = "/rest/v1/\(encodedTable)?select=*"
                let data = try await performRequest(endpoint: endpoint, method: "GET")

                if gradeTable == "Grade 6", let jsonString = String(data: data, encoding: .utf8) {
                    print("DEBUG: Raw Grade 6 JSON (sample): \(jsonString.prefix(500))")
                }

                let decoder = JSONDecoder()
                let studentDTOs = try decoder.decode([StudentLegacyDTO].self, from: data)

                let students = studentDTOs.map { dto in
                    Student(
                        id: UUID().uuidString,
                        name: dto.studentName,
                        grade: gradeTable.replacingOccurrences(of: "Grade ", with: ""),
                        section: dto.section ?? "",
                        house: self.houseFromString(dto.house ?? "") ?? .abuBakr,
                        gender: dto.gender ?? "",
                        password: dto.password ?? "",
                        parentCode: dto.parentCode?.value ?? ""
                    )
                }

                allStudents.append(contentsOf: students)
                print("DEBUG: Fetched \(students.count) students from \(gradeTable)")

            } catch {
                print("DEBUG: Error fetching from \(gradeTable): \(error)")
            }
        }

        print("DEBUG: Total students fetched: \(allStudents.count)")
        return allStudents
    }

    // MARK: - Fetch Staff

    func fetchStaff() async throws -> [(name: String, house: House?, email: String, role: String)] {
        let endpoint = "/rest/v1/\(AppConfig.Supabase.Tables.staff)?select=*"
        let data: Data
        do {
            data = try await performRequest(endpoint: endpoint, method: "GET")
        } catch {
            let legacyEndpoint = "/rest/v1/Staff?select=*"
            data = try await performRequest(endpoint: legacyEndpoint, method: "GET")
        }

        // Debug: Print raw JSON response
        if let jsonString = String(data: data, encoding: .utf8) {
            print("DEBUG: Raw staff JSON: \(jsonString)")
        }

        let decoder = JSONDecoder()

        let staffDTOs: [StaffDTO]
        do {
            staffDTOs = try decoder.decode([StaffDTO].self, from: data)
        } catch {
            let legacyDTOs = try decoder.decode([StaffLegacyDTO].self, from: data)
            staffDTOs = legacyDTOs.map {
                StaffDTO(
                    staffName: $0.staffName,
                    email: $0.email,
                    role: $0.role,
                    subject: $0.subject,
                    gradeLevel: $0.gradeLevel,
                    house: $0.house
                )
            }
        }

        print("DEBUG: Fetched \(staffDTOs.count) staff members from Supabase")
        for dto in staffDTOs {
            print("DEBUG: Staff - name: '\(dto.staffName)', email: '\(dto.email ?? "nil")'")
        }

        return staffDTOs.map { dto in
            (
                name: dto.staffName,
                house: self.houseFromString(dto.house ?? ""),
                email: dto.email ?? "",
                role: dto.role ?? ""
            )
        }
    }

    // MARK: - Fetch Admins

    func fetchAdmins() async throws -> [(name: String, email: String)] {
        let endpoint = "/rest/v1/\(AppConfig.Supabase.Tables.admin)?select=*"
        let data: Data
        do {
            data = try await performRequest(endpoint: endpoint, method: "GET")
        } catch {
            let legacyEndpoint = "/rest/v1/Admin?select=*"
            data = try await performRequest(endpoint: legacyEndpoint, method: "GET")
        }

        // Debug: Print raw JSON response
        if let jsonString = String(data: data, encoding: .utf8) {
            print("DEBUG: Raw admin JSON: \(jsonString)")
        }

        let decoder = JSONDecoder()

        let adminDTOs: [AdminDTO]
        do {
            adminDTOs = try decoder.decode([AdminDTO].self, from: data)
        } catch {
            let legacyDTOs = try decoder.decode([AdminLegacyDTO].self, from: data)
            adminDTOs = legacyDTOs.map {
                AdminDTO(
                    staffName: $0.staffName,
                    email: $0.email,
                    role: $0.role,
                    subject: $0.subject,
                    gradeLevel: $0.gradeLevel
                )
            }
        }

        print("DEBUG: Fetched \(adminDTOs.count) admins from Supabase")
        for dto in adminDTOs {
            print("DEBUG: Admin - name: '\(dto.staffName)', email: '\(dto.email ?? "nil")'")
        }

        return adminDTOs.map { dto in
            (
                name: dto.staffName,
                email: dto.email ?? ""
            )
        }
    }

    // MARK: - Fetch Merit Log

    func fetchMeritLog() async throws -> [MeritEntry] {
        let encodedTable = AppConfig.Supabase.Tables.meritLog.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? AppConfig.Supabase.Tables.meritLog
        let endpoint = "/rest/v1/\(encodedTable)?select=*"
        let data: Data
        do {
            data = try await performRequest(endpoint: endpoint, method: "GET")
        } catch {
            let legacyEncoded = "Merit Log".addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? "Merit Log"
            let legacyEndpoint = "/rest/v1/\(legacyEncoded)?select=*"
            data = try await performRequest(endpoint: legacyEndpoint, method: "GET")
        }

        // Debug: Print raw JSON
        if let jsonString = String(data: data, encoding: .utf8) {
            print("DEBUG: Raw Merit Log JSON (sample): \(jsonString.prefix(500))")
        }

        let decoder = JSONDecoder()

        // Date formatter for parsing date strings
        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "M/d/yyyy"
        let isoDateFormatter = DateFormatter()
        isoDateFormatter.dateFormat = "yyyy-MM-dd"

        let mapEntries: ([MeritLogDTO]) -> [MeritEntry] = { dtos in
            dtos.compactMap { dto -> MeritEntry? in
                guard let points = dto.points?.value else { return nil }

                let timestamp = Date()
                let dateValue = dto.dateOfEvent ?? ""
                let dateOfEvent = dateFormatter.date(from: dateValue)
                    ?? isoDateFormatter.date(from: dateValue)
                    ?? Date()

                return MeritEntry(
                    id: dto.meritId ?? UUID().uuidString,
                    timestamp: timestamp,
                    dateOfEvent: dateOfEvent,
                    staffName: dto.staffName ?? "",
                    studentName: dto.studentName ?? "",
                    grade: dto.grade?.value ?? "",
                    section: dto.section ?? "",
                    house: self.houseFromString(dto.house ?? "") ?? .abuBakr,
                    r: dto.r ?? "",
                    subcategory: dto.subcategory ?? "",
                    points: points,
                    notes: dto.notes ?? ""
                )
            }
        }

        let mapLegacyEntries: ([MeritLogLegacyDTO]) -> [MeritEntry] = { dtos in
            dtos.compactMap { dto -> MeritEntry? in
                guard let points = dto.points?.value else { return nil }

                let timestamp = Date()
                let dateValue = dto.dateOfEvent ?? ""
                let dateOfEvent = dateFormatter.date(from: dateValue)
                    ?? isoDateFormatter.date(from: dateValue)
                    ?? Date()

                return MeritEntry(
                    id: dto.meritId ?? UUID().uuidString,
                    timestamp: timestamp,
                    dateOfEvent: dateOfEvent,
                    staffName: dto.staffName ?? "",
                    studentName: dto.studentName ?? "",
                    grade: dto.grade?.value ?? "",
                    section: dto.section ?? "",
                    house: self.houseFromString(dto.house ?? "") ?? .abuBakr,
                    r: dto.r ?? "",
                    subcategory: dto.subcategory ?? "",
                    points: points,
                    notes: dto.notes ?? ""
                )
            }
        }

        do {
            let meritDTOs = try decoder.decode([MeritLogDTO].self, from: data)
            print("DEBUG: Fetched \(meritDTOs.count) merit entries from Supabase")
            return mapEntries(meritDTOs)
        } catch {
            let legacyDTOs = try decoder.decode([MeritLogLegacyDTO].self, from: data)
            print("DEBUG: Fetched \(legacyDTOs.count) merit entries from legacy Supabase table")
            return mapLegacyEntries(legacyDTOs)
        }
    }

    // MARK: - Fetch Merit Categories

    func fetchMeritCategories() async throws -> [MeritCategoryRow] {
        let endpoint = "/rest/v1/\(AppConfig.Supabase.Tables.meritCategories)?select=*"
        let data = try await performRequest(endpoint: endpoint, method: "GET")

        if let jsonString = String(data: data, encoding: .utf8) {
            print("DEBUG: Raw merit categories JSON (sample): \(jsonString.prefix(300))")
        }

        let decoder = JSONDecoder()
        let categoryDTOs = try decoder.decode([MeritCategoryDTO].self, from: data)

        return categoryDTOs.compactMap { dto in
            guard let points = dto.points?.value else { return nil }
            return MeritCategoryRow(
                id: dto.id ?? UUID().uuidString,
                rTitle: dto.r ?? "",
                subcategoryTitle: dto.subcategory ?? "",
                points: points
            )
        }
    }

    // MARK: - Fetch House Standings

    func fetchHouseStandings() async throws -> [(house: House, points: Int)] {
        let endpoint = "/rest/v1/\(AppConfig.Supabase.Tables.houseStandingsView)?select=*"
        let data = try await performRequest(endpoint: endpoint, method: "GET")

        if let jsonString = String(data: data, encoding: .utf8) {
            print("DEBUG: Raw house standings JSON (sample): \(jsonString.prefix(300))")
        }

        let decoder = JSONDecoder()
        let standingsDTOs = try decoder.decode([HouseStandingDTO].self, from: data)

        return standingsDTOs.compactMap { dto in
            guard let houseName = dto.house,
                  let points = dto.totalPoints?.value,
                  let house = self.houseFromString(houseName) else { return nil }
            return (house: house, points: points)
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
        let encodedTable = AppConfig.Supabase.Tables.meritLog.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? AppConfig.Supabase.Tables.meritLog
        let endpoint = "/rest/v1/\(encodedTable)"

        let now = Date()
        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "yyyy-MM-dd"

        let timestampFormatter = DateFormatter()
        timestampFormatter.dateFormat = "M/d/yyyy HH:mm:ss"

        let body: [String: Any] = [
            "timestamp": timestampFormatter.string(from: now),
            "date_of_event": dateFormatter.string(from: now),
            "staff_name": staffName,
            "student_name": student.name,
            "grade": student.grade,
            "section": student.section,
            "house": student.house.rawValue,
            "r": r,
            "subcategory": subcategory,
            "points": points,
            "notes": notes
        ]

        let jsonData = try JSONSerialization.data(withJSONObject: body)
        _ = try await performRequest(endpoint: endpoint, method: "POST", body: jsonData)

        print("DEBUG: Successfully added merit entry for \(student.name)")
    }

    // MARK: - Private Helpers

    private func performRequest(endpoint: String, method: String, body: Data? = nil) async throws -> Data {
        guard let url = URL(string: baseURL + endpoint) else {
            throw SupabaseError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue(apiKey, forHTTPHeaderField: "apikey")
        request.setValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        // For POST requests, we want to return the created row
        if method == "POST" {
            request.setValue("return=representation", forHTTPHeaderField: "Prefer")
        }

        if let body = body {
            request.httpBody = body
        }

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw SupabaseError.invalidResponse
        }

        // Debug: Print response for troubleshooting
        if httpResponse.statusCode >= 400 {
            if let errorString = String(data: data, encoding: .utf8) {
                print("DEBUG: Supabase error response: \(errorString)")
            }
        }

        guard (200...299).contains(httpResponse.statusCode) else {
            throw SupabaseError.httpError(httpResponse.statusCode)
        }

        return data
    }

    private func houseFromString(_ string: String) -> House? {
        let lowercased = string.lowercased()
        if lowercased.contains("abu bakr") || lowercased.contains("abū bakr") || lowercased == "abu_bakr" {
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

// MARK: - DTO Models (Data Transfer Objects)

private struct FlexibleString: Decodable {
    let value: String?

    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        if let stringValue = try? container.decode(String.self) {
            value = stringValue
        } else if let intValue = try? container.decode(Int.self) {
            value = String(intValue)
        } else if let doubleValue = try? container.decode(Double.self) {
            value = String(Int(doubleValue))
        } else {
            value = nil
        }
    }
}

private struct FlexibleInt: Decodable {
    let value: Int?

    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        if let intValue = try? container.decode(Int.self) {
            value = intValue
        } else if let stringValue = try? container.decode(String.self) {
            value = Int(stringValue.trimmingCharacters(in: .whitespacesAndNewlines))
        } else if let doubleValue = try? container.decode(Double.self) {
            value = Int(doubleValue)
        } else {
            value = nil
        }
    }
}

private struct StudentRowDTO: Decodable {
    let id: String?
    let studentName: String?
    let grade: FlexibleString?
    let section: String?
    let house: String?
    let gender: String?
    let password: String?
    let parentCode: FlexibleString?

    enum CodingKeys: String, CodingKey {
        case id
        case studentName = "student_name"
        case grade
        case section
        case house
        case gender
        case password
        case parentCode = "parent_code"
    }
}

private struct StudentLegacyDTO: Decodable {
    let studentName: String
    let grade: Int?
    let section: String?
    let house: String?
    let gender: String?
    let password: String?
    let parentCode: FlexibleString?

    enum CodingKeys: String, CodingKey {
        case studentName = "Student Name"
        case grade = "Grade"
        case section = "Section"
        case house = "House"
        case gender = "Gender"
        case password = "Password"
        case parentCode = "Parent Code"
    }
}

private struct StaffDTO: Decodable {
    let staffName: String
    let email: String?
    let role: String?
    let subject: String?
    let gradeLevel: String?
    let house: String?

    enum CodingKeys: String, CodingKey {
        case staffName = "staff_name"
        case email
        case role
        case subject
        case gradeLevel = "grade_level"
        case house
    }
}

private struct StaffLegacyDTO: Decodable {
    let staffName: String
    let email: String?
    let role: String?
    let subject: String?
    let gradeLevel: String?
    let house: String?

    enum CodingKeys: String, CodingKey {
        case staffName = "Staff Name"
        case email = "Email"
        case role = "Role"
        case subject = "Subject"
        case gradeLevel = "Grade Level"
        case house = "House"
    }
}

private struct AdminDTO: Decodable {
    let staffName: String
    let email: String?
    let role: String?
    let subject: String?
    let gradeLevel: String?

    enum CodingKeys: String, CodingKey {
        case staffName = "staff_name"
        case email
        case role
        case subject
        case gradeLevel = "grade_level"
    }
}

private struct AdminLegacyDTO: Decodable {
    let staffName: String
    let email: String?
    let role: String?
    let subject: String?
    let gradeLevel: String?

    enum CodingKeys: String, CodingKey {
        case staffName = "Staff Name"
        case email = "Email"
        case role = "Role"
        case subject = "Subject"
        case gradeLevel = "Grade Level"
    }
}

private struct MeritLogDTO: Decodable {
    let meritId: String?
    let timestamp: String?
    let dateOfEvent: String?
    let studentName: String?
    let grade: FlexibleString?
    let section: String?
    let house: String?
    let r: String?
    let subcategory: String?
    let points: FlexibleInt?
    let notes: String?
    let staffName: String?

    enum CodingKeys: String, CodingKey {
        case meritId = "id"
        case timestamp
        case dateOfEvent = "date_of_event"
        case studentName = "student_name"
        case grade
        case section
        case house
        case r
        case subcategory
        case points
        case notes
        case staffName = "staff_name"
    }
}

private struct MeritLogLegacyDTO: Decodable {
    let meritId: String?
    let timestamp: String?
    let dateOfEvent: String?
    let studentName: String?
    let grade: FlexibleString?
    let section: String?
    let house: String?
    let r: String?
    let subcategory: String?
    let points: FlexibleInt?
    let notes: String?
    let staffName: String?

    enum CodingKeys: String, CodingKey {
        case meritId = "Merit ID"
        case timestamp = "Timestamp"
        case dateOfEvent = "Date of event"
        case studentName = "Student Name"
        case grade = "Grade"
        case section = "Section"
        case house = "House"
        case r = "R"
        case subcategory = "Subcategory"
        case points = "Points"
        case notes = "Notes"
        case staffName = "Staff Name"
    }
}

private struct MeritCategoryDTO: Decodable {
    let id: String?
    let r: String?
    let subcategory: String?
    let points: FlexibleInt?

    enum CodingKeys: String, CodingKey {
        case id
        case r
        case subcategory
        case points
    }
}

private struct HouseStandingDTO: Decodable {
    let house: String?
    let totalPoints: FlexibleInt?

    enum CodingKeys: String, CodingKey {
        case house
        case totalPoints = "total_points"
    }
}

// MARK: - Errors

enum SupabaseError: LocalizedError {
    case invalidURL
    case invalidResponse
    case httpError(Int)
    case decodingError(String)

    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "Invalid URL"
        case .invalidResponse:
            return "Invalid response from server"
        case .httpError(let code):
            return "Server error: \(code)"
        case .decodingError(let message):
            return "Failed to decode data: \(message)"
        }
    }
}
