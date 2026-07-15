// g++ -std=c++17 -o demo 06-decorator.cpp
#include <iostream>
#include <memory>
#include <string>

class Beverage {
public:
  virtual std::string description() const = 0;
  virtual double cost() const = 0;
  virtual ~Beverage() = default;
};

class Espresso : public Beverage {
public:
  std::string description() const override { return "Espresso"; }
  double cost() const override { return 2.0; }
};

class CondimentDecorator : public Beverage {
protected:
  std::unique_ptr<Beverage> beverage_;
public:
  explicit CondimentDecorator(std::unique_ptr<Beverage> b)
    : beverage_(std::move(b)) {}
};

class Milk : public CondimentDecorator {
public:
  using CondimentDecorator::CondimentDecorator;
  std::string description() const override {
    return beverage_->description() + ", Milk";
  }
  double cost() const override { return beverage_->cost() + 0.5; }
};

int main() {
  auto drink = std::make_unique<Milk>(std::make_unique<Espresso>());
  std::cout << drink->description() << " = " << drink->cost() << "\n";
  return 0;
}
