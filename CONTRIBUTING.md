# Contributing to Basic Memory (Node.js Implementation)

## Welcome Contributors! 🎉

Basic Memory is an open-source, developer-first knowledge management system. We appreciate your interest in contributing!

## Contribution Guidelines

### 1. Code of Conduct
- Be respectful and inclusive
- Constructive feedback is welcome
- Collaboration is key

### 2. Development Setup

#### Prerequisites
- Node.js 18+
- npm 9+
- Git

#### Local Development
```bash
# Clone the repository
git clone https://github.com/modelcontextprotocol/basic-memory-node.git
cd basic-memory-node

# Install dependencies
npm install

# Run tests
npm test

# Start development server
npm run dev
```

### 3. Contribution Workflow

1. **Fork the Repository**
   - Click "Fork" on GitHub
   - Clone your forked repository

2. **Create a Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make Changes**
   - Follow existing code style
   - Add/update tests
   - Update documentation

4. **Commit Changes**
   ```bash
   git add .
   git commit -m "feat: describe your changes"
   ```

5. **Push Changes**
   ```bash
   git push origin feature/your-feature-name
   ```

6. **Open Pull Request**
   - Describe changes
   - Link related issues
   - Pass all checks

### 4. Code Quality Standards

- Follow [JavaScript Standard Style](https://standardjs.com/)
- 100% test coverage for new features
- Document all public APIs
- No lint warnings

### 5. Performance Considerations

- Optimize database queries
- Minimize memory usage
- Use async/await effectively
- Implement caching strategies

### 6. Testing

#### Types of Tests
- Unit Tests
- Integration Tests
- Performance Tests
- Security Tests

#### Running Tests
```bash
# Run all tests
npm test

# Run specific test suite
npm run test:unit
npm run test:integration
```

### 7. Documentation

- Update README for new features
- Add inline code comments
- Create/update API documentation
- Include usage examples

### 8. Compatibility Requirements

- Maintain 100% compatibility with Python implementation
- Support major operating systems
- Consistent cross-platform behavior

### 9. Review Process

- Automated checks must pass
- At least one maintainer review required
- Performance and compatibility benchmarks

### 10. Reporting Issues

- Use GitHub Issues
- Provide detailed description
- Include reproduction steps
- Specify environment details

## Thank You! 🚀

Your contributions make Basic Memory better for everyone!
