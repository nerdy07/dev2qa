# **App Name**: CertiTrack

## Core Features:

- User Authentication: Implement secure user authentication with email/password.
- Admin Management: Admin panel to create, view, edit, and delete users, team names, and project names. Allows for role assignment (Requester/QA Tester).
- Certificate Request Submission: Form for requesters to submit certificate requests, including task title, associated team, associated project, brief description, and optional link to the task.
- Request Management: QA dashboard to view and manage pending certificate requests. Option to approve (generating a certificate) or reject (providing a reason).
- Completion Certificates: View and print generated certificates including task details, requester name, QA tester name, date of approval, and unique ID.
- Smart Request Assignment: Utilize AI to analyze request context, automatically populate tags with the most relevant tags from the database, suggest the most fitting QA Tester for certificate request.

## Style Guidelines:

- Primary color: HSL(210, 60%, 50%) - A vibrant, professional blue (#337ab7) to inspire confidence.
- Background color: HSL(210, 20%, 95%) - A light, desaturated blue (#f0f5fa) to ensure readability and calm the interface.
- Accent color: HSL(180, 60%, 40%) - A contrasting teal (#3caea3) to draw attention to actionable elements.
- Body and headline font: 'Inter', a grotesque-style sans-serif, providing a modern, machined, objective, neutral look.
- Use clear, outline-style icons from a library like FontAwesome or Material Design Icons.
- Use a card-based layout for certificate requests and user listings in the admin panel.
- Use subtle transition animations to confirm certificate submission and approvals