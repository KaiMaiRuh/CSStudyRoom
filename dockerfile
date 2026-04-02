# เลือก Base Image เป็น Node.js version 20 เพื่อกำหนดสภาพแวดล้อมให้เหมือนกันทุกเครื่อง
FROM node:20

# กำหนดโฟลเดอร์ทำงานหลักภายใน Container เป็น /app 
WORKDIR /app

# คัดลอกไฟล์ package.json และ package-lock.json เข้าไปก่อนเพื่อเตรียมติดตั้ง Library 
COPY package*.json ./

# สั่งติดตั้ง Dependencies (Library) ทั้งหมดตามที่ระบุไว้ใน package.json
RUN npm install

# คัดลอก Source Code ทั้งหมดจากเครื่องเรา (.) เข้าไปยัง WORKDIR ใน Container (.) 
COPY . .

# แจ้งว่า Container นี้จะเปิดใช้งานผ่าน Port 5173 
EXPOSE 5173

# คำสั่งสำหรับรันโปรเจกต์ในโหมด Development โดยใช้ --host เพื่อให้เข้าถึงจาก Browser ภายนอกได้ 
CMD ["npm", "run", "dev", "--", "--host"]