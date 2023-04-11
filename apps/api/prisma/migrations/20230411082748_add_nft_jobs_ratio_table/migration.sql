-- CreateTable
CREATE TABLE "nft_jobs_ratio" (
    "id" TEXT NOT NULL,
    "job" "NFT_JOB" NOT NULL,
    "percentage" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "game_id" TEXT NOT NULL,

    CONSTRAINT "nft_jobs_ratio_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "nft_jobs_ratio_game_id_job_key" ON "nft_jobs_ratio"("game_id", "job");

-- AddForeignKey
ALTER TABLE "nft_jobs_ratio" ADD CONSTRAINT "nft_jobs_ratio_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "games"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
