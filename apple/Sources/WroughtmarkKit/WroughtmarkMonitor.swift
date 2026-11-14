import Foundation

/// Discipline classification matching `core/src/adapter.rs`.
public enum CreativeDiscipline: String, Sendable {
    case writing
    case music
    case visual
    case film

    public static func classify(url: URL) -> CreativeDiscipline? {
        switch url.pathExtension.lowercased() {
        case "md", "txt", "docx", "scriv", "tex", "rtf":
            return .writing
        case "logicx", "als", "rpp", "flp", "ptx", "wav", "aiff":
            return .music
        case "psd", "procreate", "clip", "afdesign", "kra", "blend", "fig":
            return .visual
        case "drp", "prproj", "fcpxml", "fcpbundle", "mov":
            return .film
        default:
            return nil
        }
    }
}
