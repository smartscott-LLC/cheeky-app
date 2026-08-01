const Logo = ({ ...props }) => (
  <svg
    width="32"
    height="32"
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <rect width="100%" height="100%" rx="10" fill="#EC4899" />
    <path
      d="M11.5 17.5C12.5 21.5 15.5 23 18.5 22.5C21.5 22 23.5 19.5 23.5 17.5"
      stroke="white"
      strokeWidth="2.2"
      strokeLinecap="round"
      fill="none"
    />
    <circle cx="13.5" cy="13" r="1.5" fill="white" />
    <path d="M18 13h3" stroke="white" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

export default Logo;
