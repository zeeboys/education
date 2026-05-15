import React, { useState } from 'react';

// Course Content Submission Flow
// Addresses issue #3

interface CourseSubmission {
  title: string;
  description: string;
  category: string;
  contentUrl: string;
  submittedBy: string;
}

const CATEGORIES = ['Programming', 'Mathematics', 'Science', 'Language', 'Business', 'Art'];

export const CourseSubmissionForm: React.FC<{ onSubmit: (sub: CourseSubmission) => void }> = ({ onSubmit }) => {
  const [form, setForm] = useState<CourseSubmission>({
    title: '', description: '', category: CATEGORIES[0], contentUrl: '', submittedBy: '',
  });
  const [step, setStep] = useState(1);

  const handleSubmit = () => {
    if (!form.title || !form.description || !form.contentUrl) return;
    onSubmit(form);
    setStep(3);
  };

  return (
    <div className="course-submission">
      {step === 1 && (
        <div>
          <h2>Step 1: Course Details</h2>
          <input placeholder="Title" value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
          <textarea placeholder="Description" value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
          <select value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <button onClick={() => setStep(2)} disabled={!form.title || !form.description}>Next</button>
        </div>
      )}
      {step === 2 && (
        <div>
          <h2>Step 2: Content & Review</h2>
          <input placeholder="Content URL" value={form.contentUrl} onChange={e => setForm({...form, contentUrl: e.target.value})} />
          <input placeholder="Your name" value={form.submittedBy} onChange={e => setForm({...form, submittedBy: e.target.value})} />
          <button onClick={() => setStep(1)}>Back</button>
          <button onClick={handleSubmit} disabled={!form.contentUrl}>Submit Course</button>
        </div>
      )}
      {step === 3 && <div><h2>Course Submitted!</h2><p>Thank you for your contribution.</p></div>}
    </div>
  );
};

export default CourseSubmissionForm;
