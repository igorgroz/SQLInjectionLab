# =============================================================================
# variables.tf — Input variables for infra-base
# =============================================================================

variable "aws_region" {
  description = "AWS region for all infra-base resources"
  type        = string
  default     = "ap-southeast-2"
}

variable "github_repo" {
  description = "GitHub repository for CodeBuild source (format: owner/repo)"
  type        = string
  default     = "igorgroz/SQLInjectionLab"
}

variable "github_branch" {
  description = "Branch CodeBuild will check out for the nightly destroy"
  type        = string
  default     = "master"
}

variable "terraform_version" {
  description = "Terraform version installed inside CodeBuild for the destroy job"
  type        = string
  default     = "1.7.5"
}

variable "destroy_schedule_utc" {
  description = <<-EOT
    EventBridge cron expression (UTC) for the nightly destroy job.
    Default: 12:00 UTC = 22:00 AEST (UTC+10) / 23:00 AEDT (UTC+11, Oct-Apr).
    Format:  cron(Minutes Hours Day-of-month Month Day-of-week Year)
    Docs:    https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-cron-expressions.html
  EOT
  type        = string
  default     = "cron(0 12 * * ? *)"
}

variable "codebuild_timeout_minutes" {
  description = "Max runtime for CodeBuild destroy job. EKS deletion takes 15-20 min."
  type        = number
  default     = 60
}
