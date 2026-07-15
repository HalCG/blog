// g++ -std=c++17 -o demo 03-template-method.cpp
#include <iostream>
#include <memory>

class DataExporter {
public:
  void run() {
    readData();
    format();
    write();
  }
  virtual ~DataExporter() = default;

protected:
  void readData() { std::cout << "read\n"; }
  virtual void format() = 0;
  void write() { std::cout << "write\n"; }
};

class CsvExporter : public DataExporter {
protected:
  void format() override { std::cout << "format CSV\n"; }
};

int main() {
  std::unique_ptr<DataExporter> exp = std::make_unique<CsvExporter>();
  exp->run();
  return 0;
}
