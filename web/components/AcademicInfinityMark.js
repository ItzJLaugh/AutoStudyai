export default function AcademicInfinityMark({ className = '', title = 'AutoStudyAI' }) {
  return (
    <svg className={className} viewBox="0 0 64 52" role="img" aria-label={title} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M7 31.6c5.6-13.2 13.9-16 25 0 11.2-16 19.5-13.2 25 0" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7 20.4c5.6 13.2 13.9 16 25 0 11.2 16 19.5 13.2 25 0" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      <g className="book-pages" transform="translate(47 1)" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M0 3.5C2 2.1 4.1 2 6.2 3.5v7C4.1 9.2 2 9.2 0 10.5v-7Z" />
        <path d="M12.4 3.5C10.4 2.1 8.3 2 6.2 3.5v7c2.1-1.3 4.2-1.3 6.2 0v-7Z" />
        <path d="M6.2 3.5v7" />
      </g>
    </svg>
  );
}
