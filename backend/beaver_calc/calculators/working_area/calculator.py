"""
Working area / compound layout calculator.
Checks site layout geometry, clearances, storage areas, welfare requirements
per CDM 2015 / HSG150 / BS 5975.
"""
from typing import Dict, Any
import math
from ..base import CalculatorPlugin


class WorkingAreaCalculator(CalculatorPlugin):
    key = "working_area_v1"
    name = "Working Area"
    version = "1.0.0"
    description = "Working area / compound layout per CDM 2015 / HSG150"
    category = "temporary-works"
    reference_text = "CDM 2015; HSG150; BS 5975:2019"

    def calculate(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        # Site dimensions
        site_length_m = inputs.get('site_length_m', 60.0)
        site_width_m = inputs.get('site_width_m', 40.0)

        # Works footprint
        works_length_m = inputs.get('works_length_m', 30.0)
        works_width_m = inputs.get('works_width_m', 20.0)

        # Personnel
        peak_workers = inputs.get('peak_workers', 30)

        # Storage requirements
        material_storage_m2 = inputs.get('material_storage_m2', 100.0)
        plant_storage_m2 = inputs.get('plant_storage_m2', 50.0)

        # Access requirements
        vehicle_access_width_m = inputs.get('vehicle_access_width_m', 3.7)  # one-way
        two_way_access = inputs.get('two_way_access', False)
        pedestrian_route_m = inputs.get('pedestrian_route_m', 1.2)

        # Clearances from works
        scaffold_clearance_m = inputs.get('scaffold_clearance_m', 1.5)
        crane_radius_m = inputs.get('crane_radius_m', 0)

        site_area = site_length_m * site_width_m
        works_area = works_length_m * works_width_m

        # Welfare area (HSG150 — toilets, drying room, canteen)
        # 1 toilet per 7 workers, canteen seating for 50%, drying room
        n_toilets = math.ceil(peak_workers / 7)
        toilet_area = n_toilets * 1.5  # m² per cubicle
        canteen_seats = math.ceil(peak_workers * 0.5)
        canteen_area = canteen_seats * 1.0  # 1 m² per seat
        drying_room = max(10, peak_workers * 0.4)  # m²
        welfare_area = toilet_area + canteen_area + drying_room

        # Offices (approx 4 m² per management staff, assume 10% of workforce)
        office_staff = max(2, math.ceil(peak_workers * 0.1))
        office_area = office_staff * 4.0 + 15.0  # + meeting room

        # First aid (HSG150)
        first_aid_area = 12.0 if peak_workers > 5 else 6.0

        # Parking (0.5 spaces per worker, 12.5 m² per space)
        parking_spaces = math.ceil(peak_workers * 0.5)
        parking_area = parking_spaces * 12.5

        # Access road area
        access_width = vehicle_access_width_m * 2 if two_way_access else vehicle_access_width_m
        # Assume access road runs length of site
        access_area = access_width * site_length_m

        # Total required area
        total_required = (works_area + material_storage_m2 + plant_storage_m2 +
                          welfare_area + office_area + first_aid_area +
                          parking_area + access_area)

        area_util = total_required / site_area if site_area > 0 else 999

        # Clearance check — works with scaffold + crane must fit within site
        required_footprint_width = works_width_m + 2 * scaffold_clearance_m
        if crane_radius_m > 0:
            required_footprint_width = max(required_footprint_width, 2 * crane_radius_m)
        required_footprint_length = works_length_m + 2 * scaffold_clearance_m

        width_ok = site_width_m >= required_footprint_width + access_width + pedestrian_route_m
        length_ok = site_length_m >= required_footprint_length + 10  # 10m turning area

        # Pedestrian/vehicle separation (CDM Reg 36)
        ped_sep = inputs.get('pedestrian_segregation', True)

        checks = []

        checks.append({
            "name": "Site area adequacy",
            "utilisation": round(area_util, 3),
            "status": "PASS" if area_util <= 1.0 else "FAIL",
            "detail": (f"Required {total_required:.0f} m² vs available "
                       f"{site_area:.0f} m² ({area_util * 100:.0f}%)")
        })

        checks.append({
            "name": "Width clearance",
            "utilisation": round(required_footprint_width / site_width_m, 3) if site_width_m > 0 else 999,
            "status": "PASS" if width_ok else "FAIL",
            "detail": (f"Required {required_footprint_width:.1f}m + access "
                       f"{access_width:.1f}m + ped {pedestrian_route_m:.1f}m "
                       f"vs site {site_width_m:.1f}m")
        })

        checks.append({
            "name": "Length clearance",
            "utilisation": round(required_footprint_length / site_length_m, 3) if site_length_m > 0 else 999,
            "status": "PASS" if length_ok else "FAIL",
            "detail": (f"Required {required_footprint_length:.1f}m + turning "
                       f"vs site {site_length_m:.1f}m")
        })

        checks.append({
            "name": "Pedestrian/vehicle segregation",
            "utilisation": 0 if ped_sep else 1.5,
            "status": "PASS" if ped_sep else "FAIL",
            "detail": "Segregated routes provided" if ped_sep else "CDM Reg 36: segregation required"
        })

        checks.append({
            "name": "Welfare provision (HSG150)",
            "utilisation": 0, "status": "INFO",
            "detail": (f"{n_toilets} toilets, canteen {canteen_area:.0f} m², "
                       f"drying {drying_room:.0f} m², total welfare {welfare_area:.0f} m²")
        })

        governing = max(c["utilisation"] for c in checks if c["status"] != "INFO")
        overall = "PASS" if all(c["status"] in ("PASS", "INFO") for c in checks) else "FAIL"

        return {
            "site_area_m2": round(site_area, 0),
            "works_area_m2": round(works_area, 0),
            "welfare_area_m2": round(welfare_area, 0),
            "office_area_m2": round(office_area, 0),
            "parking_area_m2": round(parking_area, 0),
            "access_area_m2": round(access_area, 0),
            "total_required_m2": round(total_required, 0),
            "n_toilets": n_toilets,
            "parking_spaces": parking_spaces,
            "checks": checks,
            "overall_status": overall,
            "utilisation": round(governing * 100, 1),
        }


calculator = WorkingAreaCalculator()
