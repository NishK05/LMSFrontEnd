/*
  Warnings:

  - A unique constraint covering the columns `[assignmentId,studentId]` on the table `Grade` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Grade_assignmentId_studentId_key" ON "Grade"("assignmentId", "studentId");
