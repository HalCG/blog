// g++ -std=c++17 -o demo 10-prototype.cpp
#include <iostream>
#include <memory>
#include <string>

class Document {
public:
  virtual std::unique_ptr<Document> clone() const = 0;
  virtual void show() const = 0;
  virtual ~Document() = default;
};

class Report : public Document {
  std::string title_;
public:
  explicit Report(std::string t) : title_(std::move(t)) {}
  std::unique_ptr<Document> clone() const override {
    return std::make_unique<Report>(*this);
  }
  void show() const override { std::cout << "Report: " << title_ << "\n"; }
};

int main() {
  Report original("Q1");
  auto copy = original.clone();
  copy->show();
  return 0;
}
