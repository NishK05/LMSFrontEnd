-- AlterTable
ALTER TABLE "File" ADD COLUMN     "assignmentId" TEXT;

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
