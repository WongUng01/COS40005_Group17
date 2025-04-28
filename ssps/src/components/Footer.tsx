const Footer = () => {
  return (
    <footer className="w-full py-4 bg-white border-t mt-8 dark:bg-gray-800 dark:border-gray-700">
      <div className="text-center text-sm text-gray-500 dark:text-gray-400">
        © {new Date().getFullYear()} Student Study Planner. All rights reserved.
      </div>
    </footer>
  );
};

export default Footer;
