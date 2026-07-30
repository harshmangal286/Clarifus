import { useRef, useState, useEffect } from 'react'
import './App.css'
import './profiles.css'
import './details.css'
import './dashboard.css'

const EXTRACTION_STEPS = [
  "Reading document contents...",
  "Layer 1: Parsing personal identity & current education...",
  "Layer 2: Extracting skills & mapping project evidence...",
  "Layer 3: Analyzing projects, domains & complexity...",
  "Layer 4: Parsing work history & achievements...",
  "Layer 5: Mapping education & coursework...",
  "Layer 6: Validating certifications...",
  "Layer 7: Extracting extracurriculars & hackathons...",
  "Assembling career decision intelligence profile..."
]

function App() {
  const [dragging, setDragging] = useState(false)
  const [status, setStatus] = useState('')
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')
  const inputRef = useRef(null)

  // Simulation of parser steps during loading
  useEffect(() => {
    let interval
    if (status) {
      setCurrentStepIndex(0)
      interval = setInterval(() => {
        setCurrentStepIndex((prev) => (prev < EXTRACTION_STEPS.length - 1 ? prev + 1 : prev))
      }, 900)
    } else {
      setCurrentStepIndex(0)
    }
    return () => clearInterval(interval)
  }, [status])

  async function upload(file) {
    if (!file) return
    setError('')
    setResult(null)
    if (file.size > 10 * 1024 * 1024) {
      setError('Please choose a file smaller than 10 MB.')
      return
    }
    setStatus(`Analyzing ${file.name}...`)
    const form = new FormData()
    form.append('file', file)
    try {
      const response = await fetch('/api/resumes/extract', { method: 'POST', body: form })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.detail || 'We could not read that resume.')
      }
      setResult(data)
      setStatus('')
      setActiveTab('overview')
    } catch (requestError) {
      setError(requestError.message)
      setStatus('')
    }
  }

  function reset() {
    setResult(null)
    setStatus('')
    setError('')
    if (inputRef.current) inputRef.current.value = ''
  }

  // Group skills by category dynamically
  const skillsByCategory = {}
  if (result?.extraction?.skills) {
    result.extraction.skills.forEach((s) => {
      const cat = s.category || 'General'
      if (!skillsByCategory[cat]) {
        skillsByCategory[cat] = []
      }
      skillsByCategory[cat].push(s)
    })
  }

  const hasExtras = result?.extraction?.extras && Object.values(result.extraction.extras).some(arr => Array.isArray(arr) && arr.length > 0)

  return (
    <main>
      <nav>
        <a className="brand" href="/">
          <i>c</i>clarifuse
        </a>
        <span>Career decision intelligence</span>
      </nav>

      <section className="intro">
        <div className="eyebrow">
          <i />Resume intelligence
        </div>
        <h1>
          Start with the<br />
          <em>signals you already have.</em>
        </h1>
        <p>
          Upload your resume and Clarifuse will build a highly detailed professional profile across 7 analysis layers.
        </p>
      </section>

      {status && (
        <section className="analysis-overlay">
          <div className="spinner"></div>
          <h2>Analyzing Profile Signals</h2>
          <p>Processing the resume using Gemini deep intelligence models...</p>
          <div className="analysis-steps">
            {EXTRACTION_STEPS.map((step, idx) => {
              let stepClass = "analysis-step"
              if (idx < currentStepIndex) stepClass += " done"
              else if (idx === currentStepIndex) stepClass += " active"
              return (
                <div key={idx} className={stepClass}>
                  <div className="analysis-step-dot" />
                  <span>{step}</span>
                  {idx < currentStepIndex && <span style={{ marginLeft: 'auto', color: '#519b6b' }}>✓</span>}
                </div>
              )
            })}
          </div>
        </section>
      )}

      {!status && !result && (
        <section className="upload-panel">
          <div className="step">01 — RESUME EXTRACTION</div>
          <h2>Bring us up to speed.</h2>
          <p>
            We look for skills, projects, experience, education, credentials, and extras. Your file is analyzed in memory and never stored.
          </p>
          <button
            className={`dropzone ${dragging ? 'dragging' : ''}`}
            onClick={() => inputRef.current?.click()}
            onDragEnter={(event) => {
              event.preventDefault()
              setDragging(true)
            }}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault()
              setDragging(false)
              upload(event.dataTransfer.files[0])
            }}
          >
            <i className="upload-icon">↑</i>
            <strong>Drop your resume here</strong>
            <small>PDF or DOCX · up to 10 MB</small>
            <u>or choose a file</u>
          </button>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.docx"
            hidden
            onChange={(event) => upload(event.target.files[0])}
          />
          {error && (
            <div className="error-card" style={{ marginTop: '20px', padding: '15px', background: '#fdf3f3', border: '1px solid #f5c2c2', borderRadius: '12px' }}>
              <p className="error" style={{ margin: 0, fontWeight: '700', fontSize: '13px' }}>Setup / Processing Error</p>
              <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: '#665' }}>{error}</p>
              {(error.toLowerCase().includes("key") || error.toLowerCase().includes("configure")) && (
                <div style={{ marginTop: '10px' }}>
                  <p style={{ margin: '0 0 5px 0', fontSize: '11px', fontWeight: 'bold' }}>To fix, add either key to your local .env file:</p>
                  <code style={{ display: 'block', padding: '6px', background: '#eaeaea', borderRadius: '6px', fontSize: '10.5px', wordBreak: 'break-all', marginBottom: '5px' }}>
                    OPENROUTER_API_KEY=your_openrouter_key
                  </code>
                  <code style={{ display: 'block', padding: '6px', background: '#eaeaea', borderRadius: '6px', fontSize: '10.5px', wordBreak: 'break-all' }}>
                    GEMINI_API_KEY=your_gemini_key
                  </code>
                </div>
              )}
            </div>
          )}
          <div className="privacy">
            <i>✓</i>
            <span>Analyzed securely and deleted immediately.</span>
          </div>
        </section>
      )}

      {!status && result && (
        <div className="dashboard-layout">
          <aside className="dashboard-sidebar">
            <h3>extraction layers</h3>
            <button
              className={`sidebar-tab ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              Overview <span className="sidebar-tab-num">L1</span>
            </button>
            <button
              className={`sidebar-tab ${activeTab === 'skills' ? 'active' : ''}`}
              onClick={() => setActiveTab('skills')}
            >
              Skills & Evidence <span className="sidebar-tab-num">L2</span>
            </button>
            <button
              className={`sidebar-tab ${activeTab === 'projects' ? 'active' : ''}`}
              onClick={() => setActiveTab('projects')}
            >
              Projects <span className="sidebar-tab-num">L3</span>
            </button>
            <button
              className={`sidebar-tab ${activeTab === 'experience' ? 'active' : ''}`}
              onClick={() => setActiveTab('experience')}
            >
              Experience <span className="sidebar-tab-num">L4</span>
            </button>
            <button
              className={`sidebar-tab ${activeTab === 'education' ? 'active' : ''}`}
              onClick={() => setActiveTab('education')}
            >
              Education <span className="sidebar-tab-num">L5</span>
            </button>
            <button
              className={`sidebar-tab ${activeTab === 'certifications' ? 'active' : ''}`}
              onClick={() => setActiveTab('certifications')}
            >
              Certifications <span className="sidebar-tab-num">L6</span>
            </button>
            <button
              className={`sidebar-tab ${activeTab === 'extras' ? 'active' : ''}`}
              onClick={() => setActiveTab('extras')}
            >
              Extras <span className="sidebar-tab-num">L7</span>
            </button>
            <div style={{ marginTop: 'auto', paddingTop: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button className="primary" style={{ width: '100%' }}>Use Profile <span>→</span></button>
              <button className="secondary" style={{ width: '100%', padding: '10px' }} onClick={reset}>
                Upload Another
              </button>
            </div>
          </aside>

          <section className="dashboard-content">
            {/* OVERVIEW TAB */}
            {activeTab === 'overview' && (
              <div>
                <div className="avatar-header">
                  <div className="avatar-circle">
                    {result.extraction.personal_information?.name?.[0]?.toUpperCase() || 'P'}
                  </div>
                  <div className="avatar-details">
                    <h1>{result.extraction.personal_information?.name || 'Candidate Profile'}</h1>
                    <p>{result.extraction.personal_information?.location || 'Location Not Specified'}</p>
                  </div>
                </div>

                <div className="dashboard-section-header">
                  <h2>Layer 1 — Personal & Education Summary</h2>
                  <p>Contact channels, active profiles, and current program details.</p>
                </div>

                <div className="personal-grid">
                  <div className="info-card">
                    <div className="info-card-header">Contact & Links</div>
                    <div className="info-row">
                      <strong>Email:</strong>
                      <span>{result.extraction.personal_information?.email || 'N/A'}</span>
                    </div>
                    <div className="info-row">
                      <strong>Phone:</strong>
                      <span>{result.extraction.personal_information?.phone || 'N/A'}</span>
                    </div>
                    <div className="info-row">
                      <strong>LinkedIn:</strong>
                      {result.extraction.personal_information?.linkedin ? (
                        <a href={result.extraction.personal_information.linkedin} target="_blank" rel="noreferrer">View Profile</a>
                      ) : <span>N/A</span>}
                    </div>
                    <div className="info-row">
                      <strong>GitHub:</strong>
                      {result.extraction.personal_information?.github ? (
                        <a href={result.extraction.personal_information.github} target="_blank" rel="noreferrer">View Profile</a>
                      ) : <span>N/A</span>}
                    </div>
                    <div className="info-row">
                      <strong>Portfolio:</strong>
                      {result.extraction.personal_information?.portfolio ? (
                        <a href={result.extraction.personal_information.portfolio} target="_blank" rel="noreferrer">View Site</a>
                      ) : <span>N/A</span>}
                    </div>
                  </div>

                  <div className="info-card">
                    <div className="info-card-header">Current Education</div>
                    <div className="info-row">
                      <strong>College:</strong>
                      <span>{result.extraction.personal_information?.current_education?.college || 'N/A'}</span>
                    </div>
                    <div className="info-row">
                      <strong>Degree:</strong>
                      <span>{result.extraction.personal_information?.current_education?.degree || 'N/A'}</span>
                    </div>
                    <div className="info-row">
                      <strong>Year:</strong>
                      <span>{result.extraction.personal_information?.current_education?.current_year || 'N/A'}</span>
                    </div>
                    <div className="info-row">
                      <strong>CGPA:</strong>
                      <span>{result.extraction.personal_information?.current_education?.cgpa || 'N/A'}</span>
                    </div>
                    <div className="info-row">
                      <strong>Graduation:</strong>
                      <span>{result.extraction.personal_information?.current_education?.graduation_year || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                <div className="insight">
                  <span>✦</span>
                  <p>
                    <strong>AI Decision Intel:</strong> This student shows {result.extraction.projects?.length || 0} projects
                    and {result.extraction.work_experience?.length || 0} work history records. 
                    {result.extraction.skills?.length > 0 && ` We identified ${result.extraction.skills.length} core competencies with varying depth of evidence.`}
                  </p>
                </div>
              </div>
            )}

            {/* SKILLS TAB */}
            {activeTab === 'skills' && (
              <div>
                <div className="dashboard-section-header">
                  <h2>Layer 2 — Skills & Evidence Mapping</h2>
                  <p>Skills extracted with structural evidence based on their actual projects and experience.</p>
                </div>

                <div className="skills-container">
                  {Object.keys(skillsByCategory).length === 0 ? (
                    <p className="no-data">No skills identified in the profile.</p>
                  ) : (
                    Object.entries(skillsByCategory).map(([category, skills]) => (
                      <div key={category} className="skills-category-group">
                        <div className="skills-category-title">
                          <strong>{category}</strong>
                          <span>{skills.length} skills</span>
                        </div>
                        <div className="skills-list">
                          {skills.map((s, idx) => (
                            <div key={idx} className="skill-tag-card">
                              <div className="skill-tag-header">
                                <span className="skill-tag-name">{s.skill}</span>
                                <span className="skill-confidence-badge">
                                  {Math.round(s.confidence * 100)}% Match
                                </span>
                              </div>
                              <div className="skill-meter-bg">
                                <div
                                  className="skill-meter-fill"
                                  style={{ width: `${s.confidence * 100}%` }}
                                />
                              </div>
                              {s.evidence?.length > 0 && (
                                <div style={{ marginTop: '5px' }}>
                                  <span style={{ fontSize: '9px', textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: '3px' }}>Evidence:</span>
                                  <ul className="skill-evidence-list">
                                    {s.evidence.map((ev, eIdx) => (
                                      <li key={eIdx}>{ev}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* PROJECTS TAB */}
            {activeTab === 'projects' && (
              <div>
                <div className="dashboard-section-header">
                  <h2>Layer 3 — Academic & Personal Projects</h2>
                  <p>In-depth look at creations, deployment, complex mechanisms, and structural domains.</p>
                </div>

                <div className="projects-list">
                  {!result.extraction.projects || result.extraction.projects.length === 0 ? (
                    <p className="no-data">No projects identified in the profile.</p>
                  ) : (
                    result.extraction.projects.map((proj, idx) => (
                      <div key={idx} className="project-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                          <div>
                            <h3 style={{ margin: 0, fontSize: '18px', color: 'var(--ink)' }}>{proj.title}</h3>
                            {proj.role && <span style={{ fontSize: '12px', color: 'var(--muted)' }}>Role: <strong>{proj.role}</strong></span>}
                          </div>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            {proj.github && (
                              <a href={proj.github} className="success" style={{ textDecoration: 'none', background: '#e2edf7', color: '#2b6299' }} target="_blank" rel="noreferrer">GitHub</a>
                            )}
                            {proj.live_demo && (
                              <a href={proj.live_demo} className="success" style={{ textDecoration: 'none' }} target="_blank" rel="noreferrer">Live Demo</a>
                            )}
                          </div>
                        </div>

                        <p style={{ fontSize: '13px', lineHeight: '1.6', color: 'var(--muted)', margin: '12px 0' }}>
                          {proj.description}
                        </p>

                        <div className="project-badges">
                          {proj.domain?.map((dom, dIdx) => (
                            <span key={dIdx} className="domain-badge">{dom}</span>
                          ))}
                          {proj.tech_stack?.map((tech, tIdx) => (
                            <span key={tIdx} className="tech-badge">{tech}</span>
                          ))}
                        </div>

                        <div className="project-meta-grid">
                          <div className="project-meta-item">
                            <span>Duration</span>
                            <strong>{proj.duration || 'N/A'}</strong>
                          </div>
                          <div className="project-meta-item">
                            <span>Team Size</span>
                            <strong>{proj.team_size || 'N/A'}</strong>
                          </div>
                          <div className="project-meta-item">
                            <span>Deployment</span>
                            <strong>{proj.deployment || 'Local'}</strong>
                          </div>
                          <div className="project-meta-item">
                            <span>Complexity</span>
                            <div className="complexity-indicator">
                              <div className={`complexity-dot ${proj.complexity?.toLowerCase() || 'medium'}`} />
                              <strong>{proj.complexity || 'Medium'}</strong>
                            </div>
                          </div>
                        </div>

                        {proj.features?.length > 0 && (
                          <div>
                            <div className="project-highlights-title">Key Implementations</div>
                            <ul style={{ paddingLeft: '17px', margin: '0 0 15px 0', fontSize: '12px', color: 'var(--muted)', lineHighlight: '1.6' }}>
                              {proj.features.map((feat, fIdx) => (
                                <li key={fIdx} style={{ marginBottom: '4px' }}>{feat}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {proj.impact && (
                          <div style={{ background: '#f5faf7', borderLeft: '3px solid #519b6b', padding: '10px 14px', borderRadius: '0 8px 8px 0', fontSize: '12px', color: '#396b4c' }}>
                            <strong>Calculated Impact:</strong> {proj.impact}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* WORK EXPERIENCE TAB */}
            {activeTab === 'experience' && (
              <div>
                <div className="dashboard-section-header">
                  <h2>Layer 4 — Work History & Internships</h2>
                  <p>Timeline of professional experience, responsibilities, leadership, and outcomes.</p>
                </div>

                <div className="timeline-container">
                  {!result.extraction.work_experience || result.extraction.work_experience.length === 0 ? (
                    <p className="no-data">No work experience identified in the profile.</p>
                  ) : (
                    result.extraction.work_experience.map((work, idx) => (
                      <div key={idx} className="timeline-item">
                        <div className="timeline-marker" />
                        <div className="timeline-content">
                          <div className="timeline-header">
                            <div className="timeline-title">
                              <h3>{work.position}</h3>
                              <span>{work.company} · {work.employment_type || 'Internship'}</span>
                            </div>
                            <div className="timeline-date">{work.duration}</div>
                          </div>

                          {work.technologies?.length > 0 && (
                            <div style={{ marginBottom: '15px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                              {work.technologies.map((tech, tIdx) => (
                                <span key={tIdx} className="tech-badge" style={{ background: '#fafcfb' }}>{tech}</span>
                              ))}
                            </div>
                          )}

                          {work.responsibilities?.length > 0 && (
                            <div>
                              <strong style={{ display: 'block', fontSize: '12px', color: 'var(--ink)', marginBottom: '6px' }}>Responsibilities:</strong>
                              <ul style={{ paddingLeft: '17px', margin: '0 0 15px 0', fontSize: '12px', color: 'var(--muted)', lineHighlight: '1.6' }}>
                                {work.responsibilities.map((resp, rIdx) => (
                                  <li key={rIdx} style={{ marginBottom: '4px' }}>{resp}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {work.achievements?.length > 0 && (
                            <div>
                              <strong style={{ display: 'block', fontSize: '12px', color: 'var(--ink)', marginBottom: '6px' }}>Key Accomplishments:</strong>
                              <ul style={{ paddingLeft: '17px', margin: '0 0 15px 0', fontSize: '12px', color: 'var(--muted)', lineHighlight: '1.6' }}>
                                {work.achievements.map((ach, aIdx) => (
                                  <li key={aIdx} style={{ marginBottom: '4px' }}>{ach}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {work.leadership?.length > 0 && (
                            <div style={{ marginTop: '10px', fontSize: '12px', color: 'var(--ink)' }}>
                              <strong>Leadership Roles:</strong> {work.leadership.join(', ')}
                            </div>
                          )}

                          {work.impact?.length > 0 && (
                            <div style={{ marginTop: '10px', fontSize: '12px', color: '#194c3d', background: '#f1faec', padding: '10px 14px', borderRadius: '8px' }}>
                              <strong>Quantifiable Impact:</strong> {work.impact.join(', ')}
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* EDUCATION TAB */}
            {activeTab === 'education' && (
              <div>
                <div className="dashboard-section-header">
                  <h2>Layer 5 — Academic History</h2>
                  <p>Higher education, school achievements, coursework, and honors.</p>
                </div>

                <div className="projects-list">
                  {!result.extraction.education || result.extraction.education.length === 0 ? (
                    <p className="no-data">No education details identified.</p>
                  ) : (
                    result.extraction.education.map((edu, idx) => (
                      <div key={idx} className="project-card">
                        <div className="timeline-header" style={{ marginBottom: '15px' }}>
                          <div>
                            <h3 style={{ margin: 0, fontSize: '17px', color: 'var(--ink)' }}>{edu.college}</h3>
                            <span style={{ fontSize: '13px', color: 'var(--muted)' }}>
                              {edu.degree} {edu.department && `in ${edu.department}`}
                            </span>
                          </div>
                          {edu.year && <div className="timeline-date">{edu.year}</div>}
                        </div>

                        <div className="project-meta-grid" style={{ gridTemplateColumns: '1fr 1fr', margin: '15px 0' }}>
                          <div className="project-meta-item">
                            <span>Score / CGPA</span>
                            <strong>{edu.cgpa || 'N/A'}</strong>
                          </div>
                          <div className="project-meta-item">
                            <span>Expected Graduation</span>
                            <strong>{edu.expected_graduation || 'N/A'}</strong>
                          </div>
                        </div>

                        {edu.relevant_coursework?.length > 0 && (
                          <div style={{ marginBottom: '15px' }}>
                            <strong style={{ display: 'block', fontSize: '12px', color: 'var(--ink)', marginBottom: '6px' }}>Relevant Coursework:</strong>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                              {edu.relevant_coursework.map((course, cIdx) => (
                                <span key={cIdx} className="tech-badge">{course}</span>
                              ))}
                            </div>
                          </div>
                        )}

                        {edu.academic_honors?.length > 0 && (
                          <div style={{ background: '#fcfaf6', borderLeft: '3px solid #d4a373', padding: '10px 14px', borderRadius: '0 8px 8px 0', fontSize: '12px', color: '#8c5d2e' }}>
                            <strong>Honors & Accolades:</strong> {edu.academic_honors.join(', ')}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* CERTIFICATIONS TAB */}
            {activeTab === 'certifications' && (
              <div>
                <div className="dashboard-section-header">
                  <h2>Layer 6 — Certifications & Credentials</h2>
                  <p>Verified skills, digital credentials, and licensing.</p>
                </div>

                <div className="personal-grid">
                  {!result.extraction.certifications || result.extraction.certifications.length === 0 ? (
                    <p className="no-data">No certifications identified in the profile.</p>
                  ) : (
                    result.extraction.certifications.map((cert, idx) => (
                      <div key={idx} className="info-card">
                        <div className="info-card-header">{cert.issuer || 'Credential'}</div>
                        <h3 style={{ margin: '0 0 8px 0', fontSize: '15px', color: 'var(--ink)' }}>{cert.name}</h3>
                        {cert.issue_date && <p style={{ fontSize: '11px', color: 'var(--muted)', margin: '0 0 12px 0' }}>Issued: {cert.issue_date}</p>}
                        
                        {cert.skills?.length > 0 && (
                          <div style={{ marginBottom: '12px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                            {cert.skills.map((s, sIdx) => (
                              <span key={sIdx} className="tech-badge" style={{ fontSize: '9px', padding: '2px 6px' }}>{s}</span>
                            ))}
                          </div>
                        )}

                        {cert.credential_url && (
                          <a
                            href={cert.credential_url}
                            target="_blank"
                            rel="noreferrer"
                            className="success"
                            style={{ display: 'inline-block', textDecoration: 'none', width: '100%', textAlign: 'center', boxSizing: 'border-box' }}
                          >
                            Verify Credential
                          </a>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* EXTRAS TAB */}
            {activeTab === 'extras' && (
              <div>
                <div className="dashboard-section-header">
                  <h2>Layer 7 — Activities & Extracurriculars</h2>
                  <p>Hackathons, open-source work, competitions, leadership, societies, and interests.</p>
                </div>

                {!hasExtras ? (
                  <p className="no-data">No additional activities or extra metrics found on this resume.</p>
                ) : (
                  <div className="extras-grid">
                    {result.extraction.extras?.hackathons?.length > 0 && (
                      <div className="extras-card">
                        <h3>Hackathons</h3>
                        <ul className="extras-list">
                          {result.extraction.extras.hackathons.map((h, idx) => (
                            <li key={idx}>{h}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {result.extraction.extras?.open_source?.length > 0 && (
                      <div className="extras-card">
                        <h3>Open Source</h3>
                        <ul className="extras-list">
                          {result.extraction.extras.open_source.map((o, idx) => (
                            <li key={idx}>{o}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {result.extraction.extras?.competitions?.length > 0 && (
                      <div className="extras-card">
                        <h3>Competitions</h3>
                        <ul className="extras-list">
                          {result.extraction.extras.competitions.map((c, idx) => (
                            <li key={idx}>{c}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {(result.extraction.extras?.research_papers?.length > 0 || result.extraction.extras?.publications?.length > 0) && (
                      <div className="extras-card">
                        <h3>Research & Publications</h3>
                        <ul className="extras-list">
                          {[...(result.extraction.extras.research_papers || []), ...(result.extraction.extras.publications || [])].map((r, idx) => (
                            <li key={idx}>{r}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {(result.extraction.extras?.volunteer_work?.length > 0 || result.extraction.extras?.leadership?.length > 0 || result.extraction.extras?.positions_of_responsibility?.length > 0) && (
                      <div className="extras-card">
                        <h3>Leadership & Volunteering</h3>
                        <ul className="extras-list">
                          {[...(result.extraction.extras.volunteer_work || []), ...(result.extraction.extras.leadership || []), ...(result.extraction.extras.positions_of_responsibility || [])].map((v, idx) => (
                            <li key={idx}>{v}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {(result.extraction.extras?.achievements?.length > 0 || result.extraction.extras?.awards?.length > 0) && (
                      <div className="extras-card">
                        <h3>Achievements & Awards</h3>
                        <ul className="extras-list">
                          {[...(result.extraction.extras.achievements || []), ...(result.extraction.extras.awards || [])].map((a, idx) => (
                            <li key={idx}>{a}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {result.extraction.extras?.languages?.length > 0 && (
                      <div className="extras-card">
                        <h3>Languages</h3>
                        <ul className="extras-list">
                          {result.extraction.extras.languages.map((l, idx) => (
                            <li key={idx}>{l}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {result.extraction.extras?.interests?.length > 0 && (
                      <div className="extras-card">
                        <h3>Interests & Hobbies</h3>
                        <ul className="extras-list">
                          {result.extraction.extras.interests.map((i, idx) => (
                            <li key={idx}>{i}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {(result.extraction.extras?.clubs?.length > 0 || result.extraction.extras?.societies?.length > 0) && (
                      <div className="extras-card">
                        <h3>Clubs & Societies</h3>
                        <ul className="extras-list">
                          {[...(result.extraction.extras.clubs || []), ...(result.extraction.extras.societies || [])].map((s, idx) => (
                            <li key={idx}>{s}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      )}
    </main>
  )
}

export default App
