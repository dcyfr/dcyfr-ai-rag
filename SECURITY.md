# Security Policy

## Supported Versions

We actively support the following versions of `@dcyfr/ai-rag`:

| Version | Supported          | Status |
| ------- | ------------------ | ------ |
| 1.x.x   | :white_check_mark: | Active support, security updates |
| 0.2.x   | :warning:          | Legacy support until v1.0.0 stable (90 days) |
| < 0.2   | :x:                | No longer supported |

**Note:** After v1.0.0 release, we will maintain security updates for the latest minor version within the current major version for a minimum of 12 months.

---

## Reporting a Vulnerability

**IMPORTANT:** Please do NOT create public GitHub issues for security vulnerabilities.

We take security seriously and appreciate responsible disclosure. If you discover a security vulnerability in `@dcyfr/ai-rag`, please report it privately using one of the following methods:

### 📧 Email (Preferred)
**Email:** security@dcyfr.ai  
**Subject:** `[SECURITY] @dcyfr/ai-rag - [Brief Description]`

**Include in your report:**
- Description of the vulnerability
- Steps to reproduce
- Affected versions
- Potential impact
- Suggested fix (if any)
- Proof of concept (if applicable)

### 🔒 GitHub Security Advisories
Use GitHub's private vulnerability reporting:
https://github.com/dcyfr/dcyfr-ai-rag/security/advisories/new

---

## Response Timeline

| Action | Timeline |
|--------|----------|
| **Initial Response** | Within 48 hours |
| **Vulnerability Triage** | Within 5 business days |
| **Fix Development** | Depends on severity (see below) |
| **Security Advisory** | Published with fix release |
| **CVE Assignment** | For critical/high severity issues |

### Severity Levels

- **Critical:** Fix within 7 days, immediate patch release
  - Examples: RCE, SQL injection, arbitrary file access, credential exposure
- **High:** Fix within 14 days, patch release
  - Examples: XSS, path traversal, denial of service
- **Medium:** Fix within 30 days, next minor/patch release
  - Examples: Information disclosure, missing input validation
- **Low:** Fix in next scheduled release
  - Examples: Weak defaults, minor information leakage

---

## Security Best Practices

When using `@dcyfr/ai-rag` in your projects:

### ✅ DO

#### Document Handling
- **Validate document sources:** Verify file paths and URLs before loading
- **Sanitize file content:** Strip potentially malicious content from HTML/Markdown
- **Limit file sizes:** Set maximum document size limits to prevent memory exhaustion
- **Use allowlists:** Restrict document loading to specific directories
- **Scan uploaded files:** Run antivirus/malware scans before ingestion

#### Vector Store Security
- **Secure credentials:** Use environment variables for vector database API keys
- **Encrypt at rest:** Enable encryption for persistent vector stores
- **Use HTTPS/TLS:** Always use secure connections to remote vector databases
- **Access control:** Implement proper authentication for vector store access
- **Audit queries:** Log and monitor vector store queries for anomalies

#### Embedding Providers
- **Protect API keys:** Never hardcode embedding provider API keys
- **Use key rotation:** Regularly rotate API keys for production systems
- **Monitor usage:** Track embedding API usage to detect abuse
- **Rate limiting:** Implement client-side rate limiting to prevent quota exhaustion
- **Fallback providers:** Configure backup embedding providers for resilience

#### Data Privacy
- **PII detection:** Scan documents for personally identifiable information
- **Data retention:** Implement policies for document and embedding deletion
- **Anonymization:** Remove or hash sensitive data before embedding
- **Compliance:** Ensure RAG system meets GDPR, CCPA, HIPAA requirements
- **Access logs:** Maintain audit trails for document access and queries

#### Dependency Management
- **Keep updated:** Regularly run `npm update @dcyfr/ai-rag`
- **Run security audits:** Execute `npm audit` before production deployments
- **Use latest stable:** Install from `^1.0.0` (semantic versioning)
- **Lock dependencies:** Commit `package-lock.json` for reproducible builds
- **Monitor advisories:** Subscribe to npm security advisories

### ❌ DON'T

#### Document Ingestion
- **Load untrusted files blindly:** Always validate document sources
- **Execute embedded scripts:** Strip `<script>` tags from HTML documents
- **Trust user-provided paths:** Validate and sanitize all file paths
- **Ignore file extensions:** Validate actual file content, not just extensions
- **Process infinite files:** Set size limits to prevent DoS attacks

#### Vector Storage
- **Store credentials in code:** Use secure credential managers
- **Expose vector store endpoints:** Keep vector databases behind firewalls
- **Share collections:** Isolate tenant data in separate vector collections
- **Skip authentication:** Always require authentication for vector store access
- **Allow unbounded queries:** Implement pagination and result limits

#### Embedding & LLMs
- **Embed sensitive data directly:** Sanitize or encrypt before embedding
- **Send full documents to APIs:** Chunk and validate content first
- **Ignore rate limits:** Respect embedding provider rate limits
- **Cache embeddings insecurely:** Encrypt cached embeddings at rest
- **Mix tenant embeddings:** Maintain strict data isolation

#### Query Handling
- **Execute user queries blindly:** Validate and sanitize all query inputs
- **Return raw vector data:** Filter and transform results before returning
- **Expose internal IDs:** Use opaque identifiers for external APIs
- **Skip metadata filtering:** Always validate metadata filter operations
- **Allow injection attacks:** Sanitize metadata filter values

---

## Known Security Considerations

### 1. Document Injection Attacks

**Risk:** Malicious documents could contain scripts or exploit HTML/Markdown parsers.

**Mitigations:**
- HTMLLoader strips `<script>` and `<style>` tags by default
- MarkdownLoader removes potentially dangerous syntax
- Validate document sources before ingestion
- Run antivirus scans on uploaded files

**Example:**
```typescript
// ✅ SECURE: Validate file path
import { resolve, join } from 'path';

const ALLOWED_DIR = '/safe/documents';

function loadDocument(userPath: string) {
  const resolvedPath = resolve(join(ALLOWED_DIR, userPath));
  
  // Prevent directory traversal
  if (!resolvedPath.startsWith(ALLOWED_DIR)) {
    throw new Error('Access denied: Path outside allowed directory');
  }
  
  return loader.load(resolvedPath);
}

// ❌ INSECURE: Direct user input
// await loader.load(req.body.filePath);  // Path traversal risk!
```

### 2. Prompt Injection via Context

**Risk:** Malicious documents in context could manipulate LLM responses.

**Mitigations:**
- Sanitize document content before embedding
- Implement content filtering for retrieved context
- Use metadata filters to restrict query scope
- Monitor query patterns for anomalies

**Example:**
```typescript
// ✅ SECURE: Sanitize context
async function getSecureContext(query: string) {
  const results = await pipeline.query(query, {
    limit: 5,
    threshold: 0.75,  // Higher threshold = more relevant, less noise
    filter: {
      field: 'verified',
      operator: 'eq',
      value: true,  // Only use verified documents
    },
  });
  
  // Sanitize context before sending to LLM
  const sanitizedContext = results.context
    .replace(/<script.*?>.*?<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .slice(0, 4096);  // Limit context size
  
  return sanitizedContext;
}
```

### 3. Vector Store Access Control

**Risk:** Unauthorized access to vector stores could expose sensitive data.

**Mitigations:**
- Use authentication for all vector database connections
- Implement role-based access control (RBAC)
- Encrypt connections with TLS
- Audit all vector store operations

**Example:**
```typescript
// ✅ SECURE: Authenticated vector store
import { InMemoryVectorStore } from '@dcyfr/ai-rag';

const store = new InMemoryVectorStore({
  collectionName: `tenant-${tenantId}`,  // Tenant isolation
  embeddingDimensions: 384,
  distanceMetric: 'cosine',
});

// Middleware to verify tenant access
function verifyTenantAccess(req, res, next) {
  if (req.user.tenantId !== req.params.tenantId) {
    return res.status(403).json({ error: 'Access denied' });
  }
  next();
}

// ❌ INSECURE: Shared collection
// const store = new InMemoryVectorStore({ collectionName: 'global' });
```

### 4. Embedding Provider API Keys

**Risk:** Exposed API keys enable unauthorized embedding generation.

**Mitigations:**
- Store API keys in environment variables
- Use key rotation policies
- Implement usage monitoring and alerts
- Use separate keys for development/production

**Example:**
```typescript
// ✅ SECURE: Environment variables
import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,  // Never hardcode!
});

// Validate key exists
if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY environment variable not set');
}

// ❌ INSECURE: Hardcoded API key
// const client = new OpenAI({ apiKey: 'sk-...' });
```

### 5. Metadata Filter Injection

**Risk:** Unsanitized metadata filter values could enable query manipulation.

**Mitigations:**
- Validate filter operators against allowlist
- Sanitize filter values
- Use parameterized queries
- Implement query complexity limits

**Example:**
```typescript
// ✅ SECURE: Validated filters
const ALLOWED_OPERATORS = ['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'in', 'nin'];

function createFilter(field: string, operator: string, value: unknown) {
  // Validate operator
  if (!ALLOWED_OPERATORS.includes(operator)) {
    throw new Error(`Invalid operator: ${operator}`);
  }
  
  // Validate field (allowlist)
  const ALLOWED_FIELDS = ['category', 'author', 'publishedYear'];
  if (!ALLOWED_FIELDS.includes(field)) {
    throw new Error(`Invalid field: ${field}`);
  }
  
  return { field, operator, value };
}

// ❌ INSECURE: Direct user input
// const filter = { ...req.body.filter };
```

### 6. Denial of Service (DoS)

**Risk:** Large queries or documents could exhaust system resources.

**Mitigations:**
- Implement request rate limiting
- Set maximum document size limits
- Limit query result counts
- Use pagination for large result sets
- Monitor resource usage

**Example:**
```typescript
// ✅ SECURE: Rate limiting and size limits
import rateLimit from 'express-rate-limit';

const queryLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 100,  // Max 100 requests per window
});

app.post('/query', queryLimiter, async (req, res) => {
  const { query } = req.body;
  
  // Validate query length
  if (query.length > 1000) {
    return res.status(400).json({ error: 'Query too long' });
  }
  
  const results = await pipeline.query(query, {
    limit: Math.min(req.body.limit || 10, 50),  // Max 50 results
  });
  
  res.json(results);
});

// Document size limiting
const MAX_FILE_SIZE = 10 * 1024 * 1024;  // 10 MB

async function ingestDocument(filePath: string) {
  const stats = await fs.stat(filePath);
  
  if (stats.size > MAX_FILE_SIZE) {
    throw new Error(`File too large: ${stats.size} bytes`);
  }
  
  return pipeline.ingest([filePath]);
}
```

---

## Dependency Security

`@dcyfr/ai-rag` depends on:

- **Node.js core modules** - `fs`, `path`, `buffer`
- **No external production dependencies** - Minimizes attack surface

**Development dependencies** (not included in production builds):
- `vitest` - Testing framework
- `@changesets/cli` - Version management
- `typescript` - Type checking

We actively monitor all dependencies for security vulnerabilities using:
- GitHub Dependabot
- npm audit
- Snyk (planned)

---

## Security Updates

Subscribe to security notifications:

- **GitHub Watch:** Click "Watch" → "Custom" → "Security alerts only"
- **npm Advisory:** https://www.npmjs.com/package/@dcyfr/ai-rag
- **RSS Feed:** https://github.com/dcyfr/dcyfr-ai-rag/security/advisories.atom
- **Security Mailing List:** security-announce@dcyfr.ai (coming soon)

---

## Vulnerability Disclosure Policy

### Timeline
1. **Report received** → We acknowledge within 48 hours
2. **Investigation** → Reproduce and assess impact (5 business days)
3. **Fix development** → Based on severity (7-30 days)
4. **Coordinated disclosure** → We notify you before public release
5. **Public advisory** → Published with fix (CVE assigned if applicable)
6. **Credit** → With your permission, we credit reporters in CHANGELOG.md

### Recognition
We maintain a Security Hall of Fame for responsible disclosure (with permission):
- https://github.com/dcyfr/dcyfr-ai-rag/blob/main/SECURITY_HALL_OF_FAME.md (coming soon)

### Bounty Program
We are planning a vulnerability reward program for critical findings (details TBD).

---

## Compliance & Standards

`@dcyfr/ai-rag` follows:

- **OWASP Top 10** - Awareness and mitigation strategies
- **CWE/SANS Top 25** - Common weakness enumeration
- **NIST AI Risk Management Framework** - AI-specific security practices
- **GDPR** - Data privacy and protection (when handling EU data)
- **CCPA** - California Consumer Privacy Act compliance
- **Semantic Versioning** - Breaking changes require major version bump

---

## Security Audit History

| Date | Type | Auditor | Results |
|------|------|---------|---------|
| TBD | Internal Security Review | DCYFR Security Team | Pending v1.0.0 release |
| TBD | Dependency Audit | Automated (Dependabot) | Ongoing |
| TBD | External Penetration Test | TBD | Planned for Q2 2026 |

---

## Incident Response

In the event of a confirmed security incident:

1. **Immediate containment** - Patch released within severity timeline
2. **User notification** - Security advisory published
3. **Post-mortem** - Incident analysis and prevention measures
4. **Documentation** - Update security policy and best practices

---

## Secure Development Practices

Our development process includes:

- **Code review** - All changes reviewed by at least 2 maintainers
- **Automated testing** - 97.67% line coverage, 86.15% branch coverage
- **Static analysis** - TypeScript strict mode, ESLint security rules
- **Dependency scanning** - Automated vulnerability detection
- **Signed commits** - GPG-signed commits for maintainers
- **Branch protection** - Required reviews, status checks

---

## Contact

**General Security:** security@dcyfr.ai  
**Package Maintainer:** @dcyfr-team  
**Emergency Contact:** For critical vulnerabilities affecting production systems, include "URGENT" in subject line  
**PGP Key:** https://keybase.io/dcyfr (coming soon)

**Response Hours:**
- Critical/High: 24/7 monitoring (48-hour response)
- Medium/Low: Business hours (5 business day response)

---

## Additional Resources

### OWASP Resources
- [OWASP Top 10 for LLM Applications](https://owasp.org/www-project-top-10-for-large-language-model-applications/)
- [OWASP Secure Coding Practices](https://owasp.org/www-project-secure-coding-practices-quick-reference-guide/)

### RAG-Specific Security
- [NIST AI Risk Management Framework](https://www.nist.gov/itl/ai-risk-management-framework)
- [Adversarial ML Threat Matrix](https://github.com/mitre/advmlthreatmatrix)
- [AI Security Best Practices](https://www.microsoft.com/en-us/security/blog/ai-security/)

### General Security
- [npm Security Best Practices](https://docs.npmjs.com/packages-and-modules/securing-your-code)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [DCYFR Organization Security Policy](https://github.com/dcyfr/.github/blob/main/SECURITY.md)

---

**Last Updated:** February 7, 2026  
**Policy Version:** 1.0.0  
**Effective Date:** Upon v1.0.0 release

---

Thank you for helping keep `@dcyfr/ai-rag` and the DCYFR ecosystem secure! 🔒

**Security is a shared responsibility.** We build secure defaults, you implement secure patterns.
