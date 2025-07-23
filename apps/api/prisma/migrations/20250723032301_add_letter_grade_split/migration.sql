-- CreateTable
CREATE TABLE "LetterGradeSplit" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "minPercent" DOUBLE PRECISION NOT NULL,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LetterGradeSplit_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "LetterGradeSplit" ADD CONSTRAINT "LetterGradeSplit_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
