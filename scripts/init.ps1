Set-Location -Path "c:\Users\Acer\OneDrive\Desktop\siet hackathon\assessment-engine\backend"
npm init -y
npm pkg set scripts.start="nodemon server.js"
npm i express cors dotenv sequelize pg pg-hstore bullmq ioredis htmlhint stylelint stylelint-config-standard eslint
npm i -D nodemon

Set-Location -Path "c:\Users\Acer\OneDrive\Desktop\siet hackathon\assessment-engine\worker"
npm init -y
npm pkg set scripts.start="node index.js"
npm i bullmq ioredis puppeteer pixelmatch pngjs dotenv

Set-Location -Path "c:\Users\Acer\OneDrive\Desktop\siet hackathon\assessment-engine\frontend"
npx -y create-vite@latest . --template react
npm install
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
npm install lucide-react react-router-dom axios
