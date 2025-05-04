
# Student Study Planner System

A Swinburne University Project for unit COS40005 Computing Technology Project A 2025. This project is by Group 17's members


## Group Members

- [Wong Zing Ung - 102770004]
- [Chow Xian Chung @ Charles - 101227237 ]


## Geting started

Tools Used:

- React using Next JS
- FastAPI
- Supabase

Project environment setup(for Windows - use PowerShell/CMD):

Install NodeJS and verify:
```bash
  winget install OpenJS.NodeJS
  node -v
  npm -v
```
Install Python and verify:
```bash
  winget install Python.Python.3.13
  python --version
  pip --version
```
Setup for backend (must be in backend folder pathand only pick one of the install):
```bash
  python -m venv venv #create virtual environment
  .\.venv\Scripts\activate #use virtual environment
  pip install fastapi uvicorn supabase 
  pip install -r requirements.txt
  pip install fastapi[all] #install CORS
  deactivate #exit virtual environment
```
If file/folder doesn't exist:
```bash
  mkdir backend
  cd backend
```
Use Uvicorn to run the FastAPI server (pick one):
```bash
  uvicorn main:app --reload # main:app can be changed to fastapi-backend.main:app for example where fastapi-backend is the name of the folder containing main.py
  Start-Process uvicorn -ArgumentList "main:app", "--reload" # to run uvicorn in background while freeing terminal
```
Setup for frontend (from root folder)
```bash
  npx create-next-app@latest ssps
  cd ssps
  npm install #install dependencies
```
TypeScript - Y <br/>
ESLint - Y <br/>
Tailwind - N <br/>
src directory - Y <br/>
App Router - Y <br/>
Turbopack - N <br/>
import alias - N

Run Local Server:
```bash
  npm run dev
```
To uninstall Project Tools:
```bash
  winget uninstall OpenJS.NodeJS
  winget uninstall Python.Python.3.13
```
    
## Documentations

All documentations can be found in the following link.

- [Software Requirement Specification (SRS)](https://swinburnesarawak-my.sharepoint.com/:w:/r/personal/102770004_students_swinburne_edu_my/Documents/Student%20Study%20Planner%20System%20Software%20Requirement%20Specification.docx?d=we3ca16fa8420466eb1cf97d703f4b166&csf=1&web=1&e=0Jmz4p)
- [System Design Document](https://swinburnesarawak-my.sharepoint.com/:w:/r/personal/102770004_students_swinburne_edu_my/Documents/System%20Design%20Document%20Study%20Planner.docx?d=w6d89270c74c048a08d18ce1751e3a0ec&csf=1&web=1&e=K3ogzT)
- [Sprint 1 Report](https://swinburnesarawak-my.sharepoint.com/:w:/r/personal/102770004_students_swinburne_edu_my/Documents/COS40005%20Sprint%20Report.docx?d=w072a4a3c187b44f8bd5d662e9a294ceb&csf=1&web=1&e=V76lWn)
- [Sprint 2 Report](https://swinburnesarawak-my.sharepoint.com/:w:/r/personal/102770004_students_swinburne_edu_my/Documents/Sprint%202%20Report.docx?d=we14ffab6861147e4b8e062b314718188&csf=1&web=1&e=ECLOQH)
- [Sprint 3 Report](https://swinburnesarawak-my.sharepoint.com/:w:/r/personal/102770004_students_swinburne_edu_my/Documents/COS40005%20Sprint%20Report3.docx?d=w14ff615268fc47ed90ba90a34d527086&csf=1&web=1&e=JpISPp)
- [Team and Project Plan](https://swinburnesarawak-my.sharepoint.com/:w:/r/personal/102770004_students_swinburne_edu_my/Documents/COS40005%20Team%20and%20Project%20Plan.docx?d=wa30c228ec5d74161b51336bbe59f4eb1&csf=1&web=1&e=Z8NYwM)
- [Trello](https://trello.com/b/h92ETyLP/study-planner-status-check-system)
- [Slides](https://www.canva.com/design/DAGkNX4cArw/DW5ad2s4cVAqIA-6K6cYhg/edit)

## Demo

TBA

## Screenshots

![App Screenshot](https://via.placeholder.com/468x300?text=App+Screenshot+Here)

## FAQ

#### Placeholder

Good answer

#### Placeholder

Good answer

