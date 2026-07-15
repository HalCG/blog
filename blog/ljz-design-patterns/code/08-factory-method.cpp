// g++ -std=c++17 -o demo 08-factory-method.cpp
#include <iostream>
#include <memory>
#include <string>

class Logger {
public:
  virtual void write(const std::string& msg) = 0;
  virtual ~Logger() = default;
};

class FileLogger : public Logger {
public:
  void write(const std::string& msg) override {
    std::cout << "file: " << msg << "\n";
  }
};

class LoggerFactory {
public:
  virtual ~LoggerFactory() = default;
  virtual std::unique_ptr<Logger> createLogger() = 0;
  void log(const std::string& msg) {
    auto logger = createLogger();
    logger->write(msg);
  }
};

class FileLoggerFactory : public LoggerFactory {
public:
  std::unique_ptr<Logger> createLogger() override {
    return std::make_unique<FileLogger>();
  }
};

int main() {
  FileLoggerFactory factory;
  factory.log("hello");
  return 0;
}
