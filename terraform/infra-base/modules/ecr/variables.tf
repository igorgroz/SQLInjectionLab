# =============================================================================
# ecr/variables.tf
# =============================================================================

variable "cluster_name" {
  description = "EKS cluster name — used for resource naming"
  type        = string
}

variable "repositories" {
  description = "Map of ECR repository names to create"
  type        = map(object({
    image_tag_mutability = optional(string, "IMMUTABLE")
    scan_on_push         = optional(bool, true)
  }))
  default = {
    "sqlinj-frontend" = {}
    "sqlinj-backend"  = {}
  }
}

variable "lifecycle_untagged_days" {
  description = "Days to keep untagged images before expiry. Untagged = intermediate build layers."
  type        = number
  default     = 1
}

variable "lifecycle_tagged_count" {
  description = "Number of tagged images to retain per repository. Older images are expired."
  type        = number
  default     = 10
}

variable "tags" {
  description = "Additional tags to apply to all ECR resources"
  type        = map(string)
  default     = {}
}
