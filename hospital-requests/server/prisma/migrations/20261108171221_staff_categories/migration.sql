-- CreateTable
CREATE TABLE "_StaffCategories" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_StaffCategories_AB_unique" ON "_StaffCategories"("A", "B");

-- CreateIndex
CREATE INDEX "_StaffCategories_B_index" ON "_StaffCategories"("B");

-- AddForeignKey
ALTER TABLE "_StaffCategories" ADD CONSTRAINT "_StaffCategories_A_fkey" FOREIGN KEY ("A") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_StaffCategories" ADD CONSTRAINT "_StaffCategories_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
