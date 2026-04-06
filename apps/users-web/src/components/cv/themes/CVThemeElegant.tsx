import type { CVThemeProps } from "../types";

export function CVThemeElegant({ data }: CVThemeProps) {
  return (
    <div
      className="w-full min-h-[1123px] bg-white text-gray-800"
      style={{ fontFamily: "'Playfair Display', serif" }}
    >
      {/* Header */}
      <div className="px-10 pt-10 pb-6 border-b-2 border-amber-600">
        <h1 className="text-3xl font-bold tracking-wide">
          {data.firstName}{" "}
          <span className="text-amber-700">{data.lastName}</span>
        </h1>
        {data.title && (
          <p className="text-amber-600 text-sm mt-1 italic font-medium">
            {data.title}
          </p>
        )}
        <div
          className="flex items-center gap-4 text-xs text-gray-500 mt-3"
          style={{ fontFamily: "'Inter', sans-serif" }}
        >
          {data.email && <span>{data.email}</span>}
          {data.phone && <span>• {data.phone}</span>}
          {data.address && <span>• {data.address}</span>}
        </div>
      </div>

      <div className="flex px-10 py-6 gap-8">
        {/* Main column */}
        <div className="flex-1 space-y-5">
          {/* Summary */}
          {data.summary && (
            <div>
              <h2 className="text-sm font-bold text-amber-700 mb-2 uppercase tracking-wider">
                Profil
              </h2>
              <p
                className="text-sm text-gray-600 leading-relaxed"
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                {data.summary}
              </p>
            </div>
          )}

          {/* Experience */}
          {data.experiences.length > 0 && (
            <div>
              <h2 className="text-sm font-bold text-amber-700 mb-3 uppercase tracking-wider">
                Expérience
              </h2>
              <div className="space-y-4">
                {data.experiences.map((exp, i) => (
                  <div key={i}>
                    <h3 className="font-bold text-sm">{exp.title}</h3>
                    <p
                      className="text-xs text-amber-600 font-medium"
                      style={{ fontFamily: "'Inter', sans-serif" }}
                    >
                      {exp.company}
                      {exp.location && ` — ${exp.location}`}
                    </p>
                    <p
                      className="text-[11px] text-gray-400 mt-0.5"
                      style={{ fontFamily: "'Inter', sans-serif" }}
                    >
                      {exp.startDate} — {exp.current ? "Présent" : exp.endDate}
                    </p>
                    {exp.description && (
                      <p
                        className="text-xs text-gray-600 mt-1 leading-relaxed"
                        style={{ fontFamily: "'Inter', sans-serif" }}
                      >
                        {exp.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Education */}
          {data.education.length > 0 && (
            <div>
              <h2 className="text-sm font-bold text-amber-700 mb-3 uppercase tracking-wider">
                Formation
              </h2>
              <div className="space-y-3">
                {data.education.map((edu, i) => (
                  <div key={i}>
                    <h3 className="font-bold text-sm">{edu.degree}</h3>
                    <p
                      className="text-xs text-gray-500"
                      style={{ fontFamily: "'Inter', sans-serif" }}
                    >
                      {edu.school}
                    </p>
                    <p
                      className="text-[11px] text-gray-400"
                      style={{ fontFamily: "'Inter', sans-serif" }}
                    >
                      {edu.startDate} — {edu.endDate || "?"}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Side column */}
        <div className="w-44 space-y-5 border-l border-amber-200 pl-6">
          {/* Skills */}
          {data.skills.length > 0 && (
            <div>
              <h2 className="text-xs font-bold text-amber-700 mb-2 uppercase tracking-wider">
                Compétences
              </h2>
              <div
                className="space-y-1.5"
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                {data.skills.map((s, i) => (
                  <div key={i}>
                    <p className="text-xs font-medium text-gray-700">
                      {s.name}
                    </p>
                    <div className="w-full bg-amber-100 rounded-full h-1 mt-0.5">
                      <div
                        className="bg-amber-600 h-1 rounded-full"
                        style={{
                          width:
                            s.level === "Expert" ? "100%"
                            : s.level === "Advanced" ? "80%"
                            : s.level === "Intermediate" ? "60%"
                            : "35%",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Languages */}
          {data.languages.length > 0 && (
            <div>
              <h2 className="text-xs font-bold text-amber-700 mb-2 uppercase tracking-wider">
                Langues
              </h2>
              <div
                className="space-y-1"
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                {data.languages.map((l, i) => (
                  <div key={i} className="flex justify-between text-xs">
                    <span className="text-gray-700">{l.name}</span>
                    <span className="text-amber-600 font-medium">
                      {l.level}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Hobbies */}
          {data.hobbies && data.hobbies.length > 0 && (
            <div>
              <h2 className="text-xs font-bold text-amber-700 mb-2 uppercase tracking-wider">
                Intérêts
              </h2>
              <div
                className="space-y-1"
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                {data.hobbies.map((h, i) => (
                  <p key={i} className="text-xs text-gray-600">
                    {h}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
