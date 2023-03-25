-- CreateTable
CREATE TABLE "ability_score_mappings" (
    "id" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "ability_r_min" INTEGER NOT NULL,
    "ability_r_max" INTEGER NOT NULL,
    "ability_b_min" INTEGER NOT NULL,
    "ability_b_max" INTEGER NOT NULL,
    "ability_l_min" INTEGER NOT NULL,
    "ability_l_max" INTEGER NOT NULL,
    "ability_k_min" INTEGER NOT NULL,
    "ability_k_max" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ability_score_mappings_pkey" PRIMARY KEY ("id")
);
