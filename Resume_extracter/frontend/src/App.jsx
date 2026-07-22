import { useRef, useState } from 'react'
import './App.css'
import './profiles.css'
import './details.css'

const label = (value) => value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())

function SignalCard({ title, value, wide = false }) {
  const values = Array.isArray(value) ? value : value ? [value] : []
  const isProfile = title === 'Github' || title === 'Linkedin'
  return <section className={`signal-card ${wide ? 'wide' : ''}`}>
    <span>{title}</span>
    {values.length ? <div>{values.map((item) => isProfile ? <a key={item} href={item} target="_blank" rel="noreferrer">{item}</a> : <b key={item}>{item}</b>)}</div> : <p>Nothing clear enough to use yet</p>}
  </section>
}

function DetailCard({ title, items, kind }) {
  return <section className="signal-card wide details-card">
    <span>{title}</span>
    {items?.length ? items.map((item) => <article key={item.title || item.role}>
      <strong>{item.title || item.role}</strong>
      {item.technologies && <em>{item.technologies}</em>}
      {item.location && <em>{item.location}</em>}
      <ul>{item.highlights.map((highlight) => <li key={highlight}>{highlight}</li>)}</ul>
    </article>) : <p>Nothing clear enough to use yet</p>}
  </section>
}

function App() {
  const [dragging, setDragging] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const inputRef = useRef(null)

  async function upload(file) {
    if (!file) return
    setError('')
    if (file.size > 10 * 1024 * 1024) { setError('Please choose a file smaller than 10 MB.'); return }
    setStatus(`Understanding ${file.name}…`)
    const form = new FormData()
    form.append('file', file)
    try {
      const response = await fetch('/api/resumes/extract', { method: 'POST', body: form })
      const data = await response.json()
      if (!response.ok) throw new Error(data.detail || 'We could not read that resume.')
      setResult(data)
      setStatus('')
    } catch (requestError) {
      setError(requestError.message)
      setStatus('')
    }
  }

  function reset() {
    setResult(null); setStatus(''); setError('')
    if (inputRef.current) inputRef.current.value = ''
  }

  return <main>
    <nav><a className="brand" href="/"><i>c</i>clarifuse</a><span>Career decision intelligence</span></nav>
    <section className="intro">
      <div className="eyebrow"><i />Resume intelligence</div>
      <h1>Start with the<br /><em>signals you already have.</em></h1>
      <p>Upload your resume and Clarifuse will extract the practical evidence behind your next career decision.</p>
    </section>

    {!result ? <section className="upload-panel">
      <div className="step">01 — RESUME EXTRACTION</div>
      <h2>Bring us up to speed.</h2>
      <p>We look for skills, projects, experience and the proof behind them. Your resume is only used for this analysis.</p>
      <button className={`dropzone ${dragging ? 'dragging' : ''}`} onClick={() => inputRef.current?.click()} onDragEnter={(event) => { event.preventDefault(); setDragging(true) }} onDragOver={(event) => event.preventDefault()} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); upload(event.dataTransfer.files[0]) }}>
        <i className="upload-icon">↑</i><strong>{status || 'Drop your resume here'}</strong><small>PDF or DOCX · up to 10 MB</small><u>or choose a file</u>
      </button>
      <input ref={inputRef} type="file" accept=".pdf,.docx" hidden onChange={(event) => upload(event.target.files[0])} />
      {error && <p className="error">{error}</p>}
      <div className="privacy"><i>✓</i><span>Your file is processed locally and is never stored.</span></div>
    </section> : <section className="results-panel">
      <div className="results-head"><div><div className="step">RESUME UNDERSTOOD</div><h2>Here’s what we found.</h2><p>We read {result.extraction.word_count} words from <b>{result.file_name}</b>. Review these signals before continuing.</p></div><span className="success">✓ EXTRACTED</span></div>
      <div className="signal-grid">
        <SignalCard title="Skills" value={result.extraction.skills} />
        <SignalCard title="Technologies" value={result.extraction.technologies} />
        <DetailCard title="Projects" items={result.extraction.project_details} kind="project" />
        <DetailCard title="Experience" items={result.extraction.experience_details} kind="experience" />
        {['certifications', 'github', 'linkedin', 'leadership'].map((key) => <SignalCard key={key} title={label(key)} value={result.extraction[key]} />)}
      </div>
      <div className="insight"><span>✦</span><p>{result.extraction.internship_experience ? 'We found internship experience — this is useful practical evidence.' : 'We did not find explicit internship evidence. A strong project can help close that gap.'}</p></div>
      <div className="actions"><button className="primary">These look right <span>→</span></button><button className="secondary" onClick={reset}>Use a different resume</button></div>
    </section>}
  </main>
}

export default App
